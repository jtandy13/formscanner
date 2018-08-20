const fs = (() => {
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

  const searchBusinessRules = (fieldName) => {
    compose(
      consoleGroupIt,
      openNewTab,
      compileUrl,
      compileBusinessRuleQuery
    )(fieldName);
  }

  const searchUiPolicies = (fieldName) => {
    compose(
      consoleGroupIt,
      openNewTab,
      compileUrl,
      compileUiPolicyQuery,
      addUiPolicyScriptSearchResults,
      searchPolicyActions
    )(fieldName);
  }

  const searchClientScripts = (fieldName) => {
    compose(
      consoleGroupIt,
      openNewTab,
      compileUrl,
      compileClientScriptQuery
    )(fieldName);
  }

  const searchScripts = (searchTerm) => {
    searchClientScripts(searchTerm);
    searchBusinessRules(searchTerm);
    searchUiPolicies(searchTerm);
  }

  const getTableName = () => {
    if (isServicePortalPage(window)) {
      return spGetTableName();
    } else {
      return getTargetFrame(window).g_form.tableName;
    }
  }

  const searchPolicyScripts = (policyArray, fieldName, policySysIds, callback) => {
    let tFrame = getTargetFrame(window);
    let promises = [];
    policyArray.forEach(policy => {
      if (policy.script_false != '' || policy.script_true != '') {
        let pgr = new tFrame.GlideRecord('sys_ui_policy');
        pgr.addQuery('sys_id', policy.sys_id);
        promises.push(new Promise((resolve, reject) => {
          pgr.query(rec => {
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

  const spGetTableName = () => {
    var gForm = angular.element("sp-variable-layout").scope().getGlideForm();
    return gForm.getTableName();
  }

  const getHostName = () => {
    return location.hostname;
  }

  const getPolicyArray = () => {
    if(isServicePortalPage(window)) {
      return spGetFormScope().policy;
    } else {
      let tFrame = getTargetFrame(window);
      return tFrame.g_ui_policy;
    }
  }

  const addUiPolicyScriptSearchResults = ({policyArray, resultSysIds, fieldName}) => {
    return new Promise((resolve, reject) => {
      searchPolicyScripts(policyArray, fieldName, resultSysIds, results => resolve(results));
    });
  }

  const compileUiPolicyQuery = (resultSysIds) => {
    let resultString = convertSysIdArrayToString(resultSysIds);
    return {
      type: 'uiPolicies',
      variables: {
        sysIdString: resultString
      }
    }
  }
  
  const searchPolicyActions = (fieldName) => {
    let policyArray = getPolicyArray();
    let resultSysIds = [];
    policyArray.forEach((policy) => {
      policy.actions.forEach((action) => {
        if (action.name == fieldName) {
          resultSysIds.push(policy.sys_id);
        }
      });
    });
    return {
      policyArray: policyArray,
      resultSysIds: resultSysIds,
      fieldName: fieldName
    }
  }

  const getParmValue = (parmName) => {
    var searchParams = new URLSearchParams(getTargetFrame(window).location.search);
    var value = searchParams.get(parmName);
    // an empty string will signify the default view
    return value || '';
  }

  const getUrlParams = (search) => {
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
    let clientScriptSysIds;
    clientScriptTypes().forEach(type => {
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

  const compileClientScriptQuery = (fieldName) => {
    let clientScriptSysIds;
    if(isServicePortalPage(window)) {
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
              return value += curr + ',';
            else
              return value += curr;
          }, '');
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

  const getBusinessRuleSysIds = (fieldName) => {
    let tFrame = getTargetFrame(window);
    let businessRuleSysIds = [];
    let gr = new tFrame.GlideRecord("sys_script");
    let tableName = getTableName();
    gr.addQuery("collection", tableName);
    return new Promise((resolve, reject) => {
      gr.query(function (rec) {
        while (rec.next()) {
          if (rec.script.search(fieldName) != -1 || rec.template.search(fieldName) != -1) {
            businessRuleSysIds.push(rec.sys_id);
          }
        }
        resolve(businessRuleSysIds);
      });
    });
  }

  const compileBusinessRuleQuery = (fieldName) => {
    let businessRuleSysIds;
    return new Promise((resolve, reject) => {
      getBusinessRuleSysIds(fieldName).then(sysIdArray => {
        let sysIdString = convertSysIdArrayToString(sysIdArray);
        resolve({
          type: 'businessRules',
          variables: {
            sysIdString: sysIdString
          }
        });
      });
    });
  }

  const convertSysIdArrayToString = (sysIdArray) => {
    return removeEmptyElements(sysIdArray).reduce((value, curr, i, a) => {
      if (i != (a.length - 1))
        return value += curr + ',';
      else
        return value += curr;
    }, '');
  }

  const compileSectionQuery = (isSpPage) => {
    let tableName;
    let viewName;
    let domain;
    if (isSpPage) {
      tableName = getParmValue('table');
      viewName = getParmValue('view');
      if (viewName == 'default')
        viewName = '';
    } else {
      tableName = getTargetFrame(window).g_form.getTableName();
      viewName = getParmValue('sysparm_view');
      domain = getTargetFrame(window).gel('sysparm_domain');
    }
    if(domain && domain.value !== 'global') {
      return{
        type: 'sectionsWithDomainSeparation',
        variables: {
          tableName: tableName,
          viewName: viewName,
          domain: domain.value
        }
      }
    } else {
      return {
        type: 'sections',
        variables: {
          tableName: tableName,
          viewName: viewName
        }
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
      case 'sectionsWithDomainSeparation':
        return {
          name: 'Sections',
          url: `https://${getHostName()}/sys_ui_section_list.do?sysparm_query=name=${variables.tableName}^view.name=${variables.viewName}^NQname=${variables.tableName}^view.name=${variables.viewName}^sys_domain=${variables.domain}&sysparm_query_no_domain=true`
        }
      case 'clientScripts':
        return {
          name: 'Client Scripts',
          url: `https://${getHostName()}/sys_script_client_list.do?sysparm_query=sys_idIN${variables.sysIdString}`
        }
      case 'businessRules':
        return {
          name: 'Business Rules',
          url: `https://${getHostName()}/sys_script_list.do?sysparm_query=sys_idIN${variables.sysIdString}`
        }
      case 'uiPolicies':
        return {
          name: 'UI Policies',
          url: `https://${getHostName()}/sys_ui_policy_list.do?sysparm_query=sys_idIN${variables.sysIdString}`
        }
      default:
        console.error(`Could not compile url for type ${type}`);
    }
  }

  // Callback to execute on DOM changes
  const breakOnMutation = (mutationList) => {
    for (let mutation of mutationList) {
      debugger;
    }
  }

  const observer = new MutationObserver(breakOnMutation);

  const breakOnChange = (selector, formField) => {
    //Since we need to detect any and all DOM changes . . . bring in the MutationObserver!
    let targetWindow = getTargetFrame(window);
    let targetNode = null;
    if(formField){
      targetNode = targetWindow.document.getElementById(`element.${targetWindow.g_form.tableName}.${selector}`);
    } else {
      targetNode = targetWindow.document.querySelector(selector);
    }
    let config = { attributes: true, childList: true, characterData: true, subtree: true };
    observer.observe(targetNode, config);
  }

  const disableBreakPoint = () => {
    if (observer) observer.disconnect();
  }

  const consoleTableIt = (a) => {
    console.table(a);
  }

  const consoleGroupIt = ({name, url}) => {
    console.group(name);
    console.log(name + ': ' + url);
    console.groupEnd();
  }

  const removeEmptyElements = arr => arr.filter(Boolean); 

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
      breakOnChange: breakOnChange,
      disableBreakPoint: disableBreakPoint,
    };
})();