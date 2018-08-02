var fs = (() => {
  var fieldChart = () => {
    if (isServicePortalPage()) {
      spfieldChart();
    } else {
      var fields = [];
      var gf = getTargetFrame().g_form;
      gf.elements.forEach(elem => {
        if (elem.tableName != 'variable') {
          var details = {};
          details.fieldLabel = gf.getLabelOf(elem.fieldName);
          details.fieldName = elem.fieldName;
          details.value = gf.getValue(elem.fieldName);
          details.type = elem.type;
          details.reference = elem.reference;
          fields.push(details);
        }
      });
      console.table(fields);
    }
  }

  var parseURL = () => {
    console.table(getUrlParams(getTargetFrame().location.search));
  }

  var getSections = () => {
    if (isServicePortalPage()) {
      spGetSections();
    } else {
      var tableName = getTargetFrame().g_form.getTableName();
      var viewName = getParmValue('sysparm_view');
      var urlString = `https://${getHostName()}/sys_ui_section_list.do?sysparm_query=name=${tableName}^view.name=${viewName}`;
      window.open(urlString, '_blank');
      console.group('Form Sections');
      console.log('Form Sections: ', urlString);
      console.groupEnd();
    }
  }

  var searchScripts = (searchTerm) => {
    if (isServicePortalPage()) {
      searchServicePortalScripts(searchTerm);
    } else {
      searchClientScripts(searchTerm);
      searchBusinessRules(searchTerm);
      searchUiPolicies(searchTerm);
    }
  }

  function searchClientScripts(fieldName) {
    var tFrame = getTargetFrame();
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
  }

  function searchBusinessRules(fieldName) {
    var tFrame = getTargetFrame();
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
    if (isServicePortalPage()) {
      return spGetTableName();
    } else {
      return getTargetFrame().g_form.tableName;
    }
  }

  function searchUiPolicies(fieldName) {
    var tFrame = getTargetFrame();
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
    var tFrame = getTargetFrame();
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

  function spfieldChart() {
    var gf = null;
    try {
      gf = angular.element("sp-variable-layout").scope().getGlideForm();
    } catch (err) {
      console.error('Unable to find the g_form object: ' + err.message);
      return;
    }
    var fieldDetails = []
    var fields = gf.getFieldNames();
    fields.forEach(fieldName => {
      var details = {};
      details.fieldLabel = gf.getLabelOf(fieldName);
      details.fieldName = fieldName;
      details.value = gf.getValue(fieldName);
      details.type = gf.getField(fieldName).type;
      details.reference = gf.getField(fieldName).refTable;
      fieldDetails.push(details);
    });
    console.table(fieldDetails);
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
    var policySysIds = getPolicySysIds(policies, fieldName);
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
  }

  function spSearchClientScripts(clientScripts, fieldName) {
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
  }

  function getParmValue(parmName) {
    var searchParams = new URLSearchParams(getTargetFrame().location.search);
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

  function getTargetFrame() {
    var tFrame;
    if (window.g_form) {
      tFrame = window;
      return tFrame;
    } else if (document.getElementById('gsft_main')) {
      tFrame = document.getElementById('gsft_main').contentWindow
      return tFrame;
    } else {
      return window;
    }
  }

  function isServicePortalPage(callback) {
    return window.NOW.hasOwnProperty("sp");
  }

  return {
      fieldChart: fieldChart, 
      parseURL: parseURL,
      getSections: getSections,
      searchScripts: searchScripts
    };
})();