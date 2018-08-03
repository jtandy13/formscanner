const fs = (() => {
  //const compose = (...fns) => x => fns.reduceRight((v,f) => f(v),x);
  const compose = (...fns) => input => fns.reduceRight((chain, func) => chain.then(func), Promise.resolve(input));
  const fieldChart = () => {
    compose(
      consoleTableIt,
      getFieldChart,
      getTargetFrame
    ) (window);
  }

  const parseURL = () => {
    compose(
      consoleTableIt,
      getUrlParams,
      getUrlQueryString,
      getTargetFrame
    ) (window);
  }

  const getSections = () => {
    compose(
      consoleGroupIt,
      openNewTab,
      compileUrl,
      compileSectionQuery
    ) (isServicePortalPage(window));
  }

  const searchScripts = (searchTerm) => {
    if (isServicePortalPage(window)) {
      searchServicePortalScripts(searchTerm);
    } else {
      searchClientScripts(searchTerm);
      searchBusinessRules(searchTerm);
      searchUiPolicies(searchTerm);
    }
  }

  const searchClientScripts = (fieldName) => {
    compose(
      consoleGroupIt,
      openNewTab,
      compileUrl,
      compileClientScriptQuery
    )(fieldName, isServicePortalPage(window));
  }

  /* function searchClientScripts(fieldName) {
    var tFrame = getTargetFrame(window);
    var clientScriptsObj = tFrame.g_event_handler_ids;
    var scriptSysIds = [];
    var promises = [];
    for (var prop in clientScriptsObj) {
      var gr = new tFrame.GlideRecord("sys_script_client");
      gr.addQuery("sys_id", clientScriptsObj[prop]);
      promises.push(new Promise((resolve, reject) => {
        gr.query(function (rec) {
            while (rec.next()) {
              if (rec.script.search(fieldName) != -1) {
                scriptSysIds.push(rec.sys_id);
              }
            }
            resolve();
        });
      }));
    }
    Promise.all(promises)
      .then(() => {
        var sysIdString = '';
        if (scriptSysIds.length != 0) {
          scriptSysIds.forEach((sys_id, index, arr) => {
            if(index != (arr.length - 1))
              sysIdString += sys_id + ',';
            else
            sysIdString += sys_id;
          });
          var urlString = `https://${getHostName()}/sys_script_client_list.do?sysparm_query=sys_idIN${sysIdString}`;
          window.open(urlString, '_blank');
          console.group('Client Scripts');
          console.log('Client Scripts: ', urlString);
          console.groupEnd();
        } else {
          console.group('Client Scripts');
          console.log('Zero results. Check access if not admin');
          console.groupEnd();
        }
      });
  } */

  function searchBusinessRules(fieldName) {
    var tFrame = getTargetFrame(window);
    var businessRuleSysIds = [];
    var gr = new tFrame.GlideRecord("sys_script");
    var tableName = getTableName();
    gr.addQuery("collection", tableName);
    new Promise((resolve, reject) => {
      gr.query(function (rec) {
        while (rec.next()) {
          if (rec.script.search(fieldName) != -1 || rec.template.search(fieldName) != -1) {
            businessRuleSysIds.push(rec.sys_id);
          }
        }
        resolve();
      });
    }).then(() => {
      var sysIdString = '';
      if (businessRuleSysIds.length != 0) {
        businessRuleSysIds.forEach((sys_id, index, arr) => {
          if(index != (arr.length - 1))
            sysIdString += sys_id + ',';
          else
          sysIdString += sys_id;
        });
        var urlString = `https://${getHostName()}/sys_script_list.do?sysparm_query=sys_idIN${sysIdString}`;
        window.open(urlString, '_blank');
        console.group('Business Rules');
        console.log('Business Rules: ', urlString);
        console.groupEnd();
      } else {
        console.group('Business Rules');
        console.log('Zero results. Check access if not admin');
        console.groupEnd();
      }
    });
  }

  function getTableName() {
    if (isServicePortalPage(window)) {
      return spGetTableName();
    } else {
      return getTargetFrame(window).g_form.tableName;
    }
  }

  function searchUiPolicies(fieldName) {
    var tFrame = getTargetFrame(window);
    var policyArray = tFrame.g_ui_policy;
    //getPolicySysIds should return a promise
    getPolicySysIds(policyArray, fieldName)
      .then(policySysIds => {
        if(policySysIds != ''){
          var urlString = `https://${getHostName()}/sys_ui_policy_list.do?sysparm_query=sys_idIN${policySysIds}`;
          window.open(urlString, '_blank');
          console.group('UI Policies');
          console.log('UI Policies: ', urlString);
          console.groupEnd();
        } else {
          console.group('UI Policies');
          console.log('Zero Results');
          console.groupEnd();
        }
      });
  }

  function getPolicySysIds(policyArray, fieldName) {
    var policySysIds = [];
    policyArray.forEach((policy) => {
      policy.actions.forEach((action) => {
        if (action.name == fieldName) {
          policySysIds.push(policy.sys_id);
        }
      });
    });
    return new Promise((resolve, reject) => {
      searchPolicyScripts(policyArray, fieldName, policySysIds, function (results) {
        resolve(results);
      });
    });
  }

  function searchPolicyScripts(policyArray, fieldName, policySysIds, callback) {
    var tFrame = getTargetFrame(window);
    var promises = [];
    policyArray.forEach(policy => {
      if (policy.script_false != '' || policy.script_true != '') {
        var pgr = new tFrame.GlideRecord('sys_ui_policy');
        pgr.addQuery('sys_id', policy.sys_id);
        promises.push(new Promise((resolve, reject) => {
          pgr.query(function (rec) {
            while (rec.next()) {
              if (rec.script_true.search(fieldName) != -1 || rec.script_false.search(fieldName) != -1) {
                if (policySysIds.indexOf(policy.sys_id) == -1) {
                  policySysIds.push(policy.sys_id);
                }
              }
            }
            resolve(policySysIds);
          });
        }));
      }
    });
    if(promises.length == 0) {
      callback(policySysIds);
    } else {
      Promise.all(promises)
      .then((policySysIds) => {
        callback(policySysIds);
      });
    }
  }

  const spfieldChart = () => {
    let gf = null;
    try {
      gf = angular.element("sp-variable-layout").scope().getGlideForm();
    } catch (err) {
      console.error('Unable to find the g_form object: ' + err.message);
      return;
    }
    let fieldDetails = []
    let fields = gf.getFieldNames();
    fields.forEach(fieldName => {
      let details = {};
      details.fieldLabel = gf.getLabelOf(fieldName);
      details.fieldName = fieldName;
      details.value = gf.getValue(fieldName);
      details.type = gf.getField(fieldName).type;
      details.reference = gf.getField(fieldName).refTable;
      fieldDetails.push(details);
    });
    return fieldDetails;
  }

  function spGetTableName() {
    var gForm = angular.element("sp-variable-layout").scope().getGlideForm();
    return gForm.getTableName();
  }

  function spGetSections() {
    var tableName = getParmValue('table');
    var viewName = getParmValue('view');
    if (viewName == 'default')
      viewName = '';
    var urlString = `https://${getHostName()}/sys_ui_section_list.do?sysparm_query=name=${tableName}^view.name=${viewName}`;
    window.open(urlString, '_blank');
    console.table({"Form Sections": urlString});
  }

  function searchServicePortalScripts(fieldName) {
    var widgetScopes = [];
    var spWidgets = document.querySelectorAll("[widget='widget']");
    var formWidgetScope = null;

    spWidgets.forEach((widget, i) => {
      var thisScope = angular.element(spWidgets[i]).scope();
      if (thisScope.hasOwnProperty('data') && thisScope.data.hasOwnProperty('f'))
        formScope = thisScope.data.f;
    });
    var clientScripts = formScope.client_script; 
    var policies = formScope.policy;
    spSearchUiPolicies(policies, fieldName);
    spSearchClientScripts(clientScripts, fieldName);
    searchBusinessRules(fieldName);
  }

  function getHostName() {
    return location.hostname;
  }

  function spSearchUiPolicies(policies, fieldName) {
    getPolicySysIds(policies, fieldName)
      .then(policySysIds => {
        if(policySysIds != '') {
          var urlString = `https://${getHostName()}/sys_ui_policy_list.do?sysparm_query=sys_idIN${policySysIds}`;
          window.open(urlString, '_blank');
          console.group('UI Policies');
          console.log('UI Policies: ', urlString);
          console.groupEnd();
        } else {
          console.group('UI Policies');
          console.log('Zero results.');
          console.groupEnd();
        }
      });
  }

  /* function spSearchClientScripts(clientScripts, fieldName) {
    var clientScriptSysIds = '';
    if(clientScripts.hasOwnProperty('onChange')) {
      if(clientScripts.onChange.length > 0) {
        clientScripts.onChange.forEach(clientScript => {
          if(clientScript.script.search(fieldName) != -1)
            clientScriptSysIds += clientScript.sys_id + ',';
        }); 
      }
    } 
    if(clientScripts.hasOwnProperty('onLoad')) {
      if(clientScripts.onLoad.length > 0) {
        clientScripts.onLoad.forEach(clientScript => {
          if(clientScript.script.search(fieldName) != -1)
            clientScriptSysIds += clientScript.sys_id + ',';
        }); 
      }
    }
    if(clientScripts.hasOwnProperty('onSubmit')) {
      if(clientScripts.onSubmit.length > 0) {
        clientScripts.onSubmit.forEach(clientScript => {
          if(clientScript.script.search(fieldName) != -1)
            clientScriptSysIds += clientScript.sys_id + ',';
        }); 
      }
    }
    if(clientScriptSysIds != '') {
      var urlString = `https://${getHostName()}/sys_script_client_list.do?sysparm_query=sys_idIN${clientScriptSysIds}`;
      window.open(urlString, '_blank');
      console.group('Client Scripts');
      console.log('Client Scripts: ', urlString);
      console.groupEnd();
    } else {
      console.group('Client Scripts');
      console.log('Zero results.');
      console.groupEnd();
    }
  } */

  function getParmValue(parmName) {
    var searchParams = new URLSearchParams(getTargetFrame(window).location.search);
    var value = searchParams.get(parmName);
    // an empty string will signify the default view
    return value || '';
  }

  function getUrlParams(search) {
    let hashes = search.slice(search.indexOf('?') + 1).split('&');
    let params = {}
    hashes.map(hash => {
        let [key, val] = hash.split('=');
        params[key] = decodeURIComponent(val);
    })
    return params
}

  const getTargetFrame = (context) => {
    let tFrame;
    if (context.hasOwnProperty('g_form')) {
      tFrame = context;
      return tFrame;
    } else if (document.getElementById('gsft_main')) {
      tFrame = document.getElementById('gsft_main').contentWindow
      return tFrame;
    } else {
      return context;
    }
  }

  const getFieldChart = (frame) => {
    if (isServicePortalPage(window)) {
      return spfieldChart();
    } else {
      let fields = [];
      let gf = frame.g_form;
      gf.elements.forEach(elem => {
        if (elem.tableName != 'variable') {
          let details = {};
          details.fieldLabel = gf.getLabelOf(elem.fieldName);
          details.fieldName = elem.fieldName;
          details.value = gf.getValue(elem.fieldName);
          details.type = elem.type;
          details.reference = elem.reference;
          fields.push(details);
        }
      });
      return fields;
    }
  }

  const spGetFormScope = () => {
    let widgetScopes = [];
    let spWidgets = document.querySelectorAll("[widget='widget']");
    let formScope = null;

    spWidgets.forEach((widget, i) => {
      let thisScope = angular.element(spWidgets[i]).scope();
      if (thisScope.hasOwnProperty('data') && thisScope.data.hasOwnProperty('f'))
        formScope = thisScope.data.f;
    });

    return formScope;
  }

  const spGetClientScriptSysIds = (fieldName) => {
    let clientScripts = spGetFormScope().client_script;
    let clientScriptSysIds = clientScriptTypes().forEach(type => {
      if(clientScripts.hasOwnProperty(type)) {
        if(clientScripts[type].length > 0) {
          clientScripts[type].forEach(clientScript => {
            if(clientScript.script.search(fieldName) != -1)
              clientScriptSysIds += clientScript.sys_id + ',';
          }); 
        }
      } 
    });
    return clientScriptSysIds;
  }

  const clientScriptTypes = () => ['onChange', 'onLoad', 'onSubmit'];

  const getClientScriptsSysIds = (fieldName) => {
    let tFrame = getTargetFrame(window);
    let clientScriptsObj = tFrame.g_event_handler_ids;
    let scriptSysIds = [];
    let promises = [];
    for (let prop in clientScriptsObj) {
      let gr = new tFrame.GlideRecord("sys_script_client");
      gr.addQuery("sys_id", clientScriptsObj[prop]);
      promises.push(new Promise((resolve, reject) => {
        gr.query(function (rec) {
          while (rec.next()) {
            if (rec.script.search(fieldName) != -1) {
              resolve(rec.sys_id);
            } else {
              resolve();
            }
          }
        });
      }));
    }
    return Promise.all(promises);
  }

  const compileClientScriptQuery = (fieldName, isSpPage) => {
    let clientScriptSysIds;
    if(isSpPage) {
      clientScriptSysIds = spGetClientScriptSysIds(fieldName);
      return {
        type: 'clientScripts',
        variables: {
          sysIdString: clientScriptSysIds
        }
      }
    } else {
      return new Promise((resolve, reject) => {
        getClientScriptsSysIds(fieldName).then(sysIdArray => {
          let sysIdString = removeEmptyElements(sysIdArray).reduce((value, curr, i, a) => {
            if (i != (a.length - 1))
              return curr + ',';
            else
              return curr
          });
          debugger;
          resolve({
            type: 'clientScripts',
            variables: {
              sysIdString: sysIdString
            }
          });
        });
      });
    }
  }

  const removeEmptyElements = arr => arr.filter(Boolean); 

  const compileSectionQuery = (isSpPage) => {
    let tableName;
    let viewName;
    if (isSpPage) {
      tableName = getParmValue('table');
      viewName = getParmValue('view');
      if (viewName == 'default')
        viewName = '';
    } else {
      tableName = getTargetFrame(window).g_form.getTableName();
      viewName = getParmValue('sysparm_view');
    }
    return {
      type: 'sections',
      variables: {
        tableName: tableName,
        viewName: viewName
      }
    }
  }

  const compileUrl = ({type, variables}) => {
    switch (type) {
      case 'sections':
        return {
          name: 'Sections',
          url: `https://${getHostName()}/sys_ui_section_list.do?sysparm_query=name=${variables.tableName}^view.name=${variables.viewName}`
        }
      case 'clientScripts':
        return {
          name: 'Client Scripts',
          url: `https://${getHostName()}/sys_script_client_list.do?sysparm_query=sys_idIN${variables.sysIdString}`
        }
      default:
        console.error(`Could not compile url for type ${type}`);
    }
  }

  const consoleTableIt = (a) => {
    console.table(a);
  }

  const consoleGroupIt = ({name, url}) => {
    console.group(name);
    console.log(name + ': ' + url);
    console.groupEnd();
  }

  const openNewTab = ({name, url}) => {
    window.open(url, '_blank');
    return {name, url};
  }

  const isServicePortalPage = (context) => {
    return context.NOW.hasOwnProperty('sp');
  }

  const getUrlQueryString = (context) => {
    return context.location.search;
  }

  return {
      fieldChart: fieldChart, 
      parseURL: parseURL,
      getSections: getSections,
      searchScripts: searchScripts,
      //DEBUG
      getClientScriptsSysIds: getClientScriptsSysIds
    };
})();