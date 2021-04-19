function lambda(input, callback) {
    const { Toolbelt } = require("lp-faas-toolbelt");    
    const httpClient = Toolbelt.HTTPClient(); // For API Docs look @ https://www.npmjs.com/package/request-promise
    const secretClient = Toolbelt.SecretClient();      
    const botNames = [
      "FAAS-Runner-Bot-01"
      ]

const main = async (input, callback) => {

    const appLogin = async (appKey) => {
      // const appKey = await secretClient.readSecret('FAAS-Runner-Bot-01');
      // console.info(JSON.stringify(appKey))
      const domain = 'sy.agentvep.liveperson.net'; 
      var res = await httpClient(`https://${domain}/api/account/${process.env.BRAND_ID}/login?v=1.3`, {          
          method: "POST",        
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(appKey.value),
          simple: false, // IF true => Status Code != 2xx & 3xx will throw
          resolveWithFullResponse: false //IF true => Includes Status Code, Headers etc.
        })
        .then(response => {          
          // console.info("response:" + JSON.stringify(response))
          return {
            successResult: true,
            response: response
          };
        })
        .catch(err => {
          console.error(`Failed during secret operation with ${JSON.stringify(err)}`);
          return {
            successResult: false
          };          
        });
      return res;
    }

    const updateToken = async (secretName, bearer, csrf) => {
      // updateToken(secretName, login.response);
      console.info(bearer)
      console.info(JSON.stringify({
        secretName: secretName,
        token: bearer,
        csrf: csrf
      }))
      secretClient.readSecret(secretName)
      .then(mySecret => {        
        let value = mySecret.value;
        value.bearer = bearer
        value.csrf = csrf
        value.lastUpdate = Date.now()
        mySecret.value = value;        
        return secretClient.updateSecret(mySecret);
      })
      .then(_ => {
        callback(null, { message: "Successfully updated secret" });
      })
      .catch(err => {
        console.error(`Failed during secret operation with ${err.message}`);
        callback(err, null);
      });
    }

    const refreshToken = async (appKey) => {
      // const appKey = await secretClient.readSecret('FAAS-Runner-Bot-01');
      // console.info(JSON.stringify(appKey))
      const domain = 'sy.agentvep.liveperson.net'; 
      var res = await httpClient(`https://${domain}/api/account/${process.env.BRAND_ID}/refresh`, {          
          method: "POST",        
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ csrf: appKey.value.csrf}),
          simple: false, // IF true => Status Code != 2xx & 3xx will throw
          resolveWithFullResponse: false //IF true => Includes Status Code, Headers etc.
        })
        .then(response => {          
          // console.info("response:" + JSON.stringify(response))
          return {
            successResult: true,
            response: response
          };
        })
        .catch(err => {
          console.error(`Failed during secret operation with ${JSON.stringify(err)}`);
          return {
            successResult: false
          };          
        });
      return res;
    }

    const runProcess = async () => {
      for (var i in botNames) {

        let appKey = await secretClient.readSecret(botNames[i]); // 'FAAS-Runner-Bot-01'
        // console.info(JSON.stringify({bearer: !appKey.value.bearer ? false : true,csrf: !appKey.value.csrf ? false : true}))
        const lastUpdate = (appKey.lastUpdate) ? appKey.lastUpdate : Date.now()
        const now = Date.now()
        const passed = Number((now - lastUpdate) / 60000) // minutes since last login        
        console.info(`passed: ${passed}, now: ${now}, last: ${lastUpdate}`)
        if ((appKey.value.csrf && passed < 25 && appKey.lastUpdate)) {
          const refresh = await refreshToken(appKey)
          if (refresh.successResult === true) {
            console.info("Refreshed Bot Login")
            return { successResult: true, message: 'refreshed login' }
          } else {
            console.info("Error refreshing token, performing login")
          }
        }
        const login = await appLogin(appKey)
        const { bearer, csrf } = JSON.parse(login.response)        
        if (login.successResult === true) {
          updateToken(botNames[i], bearer, csrf);
          console.info("Bot login successful")
          return { successResult: true }
          } else {
            console.info("Bot login failed")
            return { successResult: false, message: 'login failed' }
          }
        }
    }

    callback(null, runProcess());
    }
    main(input, callback);
}