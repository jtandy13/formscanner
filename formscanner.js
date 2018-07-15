//TODO: add in support for domain separation
//DONE: add functions to return URLs to the current form sections, elements, view.
//DONE: add in URLs for all loaded client scripts and ui policies and actions
//DONE: include search functions for Service Portal form scripts
//TODO: add toggleNav function
//TODO: add in support for user personalisations to forms/views
//TODO: filter out variables
var fs = (() => {
  var fieldChart = () => {
    if (isServicePortalPage()) {
      spfieldChart();
    } else {
      if (!getTargetFrame().fields)
        var fields = [];
      else
        getTargetFrame().fields = [];
      var gf = getTargetFrame().g_form;
      gf.elements.forEach(elem => {
        var details = {};
        details.fieldLabel = gf.getLabelOf(elem.fieldName);
        details.fieldName = elem.fieldName;
        details.value = gf.getValue(elem.fieldName);
        details.type = elem.type;
        details.reference = elem.reference;
        fields.push(details);
      });
      console.table(fields);
    }
  }

  var parseURL = () => {
    console.info(getUrlParams(getTargetFrame().location.search));
  }

  var getSections = () => {
    if (isServicePortalPage()) {
      spGetSections();
    } else {
      var tableName = getTargetFrame().g_form.getTableName();
      var viewName = getParmValue('sysparm_view');
      var urlString = `https://${getHostName()}/sys_ui_section_list.do?sysparm_query=name=${tableName}^view.name=${viewName}`;
      window.open(urlString, '_blank');
      console.table({"Form Sections": urlString});
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

  var searchClientScripts = (fieldName) => {
    var tFrame = getTargetFrame();
    var clientScriptsObj = tFrame.g_event_handler_ids;
    var scriptSysIds = [];
    var promises = [];
    for (var prop in clientScriptsObj) {
      var gr = new tFrame.GlideRecord("sys_script_client");
      gr.addQuery("sys_id", clientScriptsObj[prop]);
      promises.push(new Promise((resolve, reject) => {
        gr.query(function (rec) {
          rec.next();
          if (rec.script.search(fieldName) != -1) {
            scriptSysIds.push(rec.sys_id);
          }
          resolve();
        });
      }));
    }
    Promise.all(promises)
      .then(() => {
        sysIdString = '';
        scriptSysIds.forEach((sys_id, index, arr) => {
          if(index != (arr.length - 1))
            sysIdString += sys_id + ',';
          else
          sysIdString += sys_id;
        });
        var urlString = `https://${getHostName()}/sys_script_client_list.do?sysparm_query=sys_idIN${sysIdString}`;
        window.open(urlString, '_blank');
        console.table({"Client Scripts": urlString});
      });
  }

  var searchBusinessRules = (fieldName) => {
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
      sysIdString = '';
      businessRuleSysIds.forEach((sys_id, index, arr) => {
        if(index != (arr.length - 1))
          sysIdString += sys_id + ',';
        else
        sysIdString += sys_id;
      });
      var urlString = `https://${getHostName()}/sys_script_list.do?sysparm_query=sys_idIN${sysIdString}`;
      window.open(urlString, '_blank');
      console.table({"Business Rules": urlString});
     })
  }

  function getTableName() {
    if (isServicePortalPage) {
      return spGetTableName();
    } else {
      return getTargetFrame().g_form.tableName;
    }
  }

  var searchUiPolicies = (fieldName) => {
    var tFrame = getTargetFrame();
    var policyArray = tFrame.g_ui_policy;
    var policySysIds = getPolicySysIds(policyArray, fieldName);
    var urlString = `https://${getHostName()}/sys_ui_policy_list.do?sysparm_query=sys_idIN${policySysIds}`;
      window.open(urlString, '_blank');
      console.table({"UI Policies": urlString});
  }

  function getPolicySysIds(policyArray, fieldName) {
    var policySysIds = '';
    policyArray.forEach((policy) => {
      policy.actions.forEach((action) => {
        if (action.name == fieldName) {
          policySysIds += policy.sys_id + ',';
        }
      });
    });
    return policySysIds;
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
    console.log(formScope);
  }

  function getHostName() {
    return location.hostname;
  }

  function spSearchUiPolicies(policies, fieldName) {
    var policySysIds = getPolicySysIds(policies, fieldName);
    var urlString = `https://${getHostName()}/sys_ui_policy_list.do?sysparm_query=sys_idIN${policySysIds}`;
    window.open(urlString, '_blank');
    console.table({"UI Policies": urlString});
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
    var urlString = `https://${getHostName()}/sys_script_client_list.do?sysparm_query=sys_idIN${clientScriptSysIds}`;
    window.open(urlString, '_blank');
    console.table({"Client Scripts": urlString});
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