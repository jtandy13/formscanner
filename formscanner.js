//TODO: add in support for domain separation
//DONE: add functions to return URLs to the current form sections, elements, view.
//TODO: add in URLs for all loaded client scripts and ui policies and actions
//TODO: allow for a single parameter for fieldChart()
//TODO: include search functions for client scripts, ui policies, ui actions, business rules
//TODO: add toggleNav function
//TODO: add in support for user personalisations to forms/views
var formscanner = (() => {
  var fieldChart = () => {
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

  var spfieldChart = () => {
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

  var parseURL = () => {
    console.info(getUrlParams(getTargetFrame().location.search));
  }

  var getSections = () => {
    var tableName = getTargetFrame().g_form.getTableName();
    var viewName = getParmValue('sysparm_view');
    var urlString = `https://${getTargetFrame().location.hostname}/sys_ui_section_list.do?sysparm_query=name=${tableName}^view.name=${viewName}`;
    window.open(urlString, '_blank');
    console.log(urlString);
  }

  var spGetSections = () => {
    var tableName = getParmValue('table');
    var viewName = getParmValue('view');
    if (viewName == 'default')
      viewName = '';
    var urlString = `https://${getTargetFrame().location.hostname}/sys_ui_section_list.do?sysparm_query=name=${tableName}^view.name=${viewName}`;
    window.open(urlString, '_blank');
    console.log(urlString);
  }

  var searchScripts = (searchTerm) => {
    searchClientScripts(searchTerm);
    searchBusinessRules(searchTerm);
    searchUiPolicies(searchTerm);
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
        var urlString = `https://${tFrame.location.hostname}/sys_script_client_list.do?sysparm_query=sys_idIN${sysIdString}`;
        window.open(urlString, '_blank');
        console.log(urlString);
      });
  }

  var searchBusinessRules = (fieldName) => {
    var tFrame = getTargetFrame();
    var businessRuleSysIds = [];
    var gr = new tFrame.GlideRecord("sys_script");
    gr.addQuery("collection", tFrame.g_form.tableName);
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
      var urlString = `https://${tFrame.location.hostname}/sys_script_list.do?sysparm_query=sys_idIN${sysIdString}`;
      window.open(urlString, '_blank');
      console.log(urlString);
     })
  }

  var searchUiPolicies = (fieldName) => {
    var tFrame = getTargetFrame();
    var uiPolicyArray = tFrame.g_ui_policy;
    var policySysIds = '';
    uiPolicyArray.forEach((policy) => {
      policy.actions.forEach((action) => {
        if (action.name == fieldName) {
          policySysIds += policy.sys_id + ',';
        }
      });
    });
    var urlString = `https://${tFrame.location.hostname}/sys_ui_policy_list.do?sysparm_query=sys_idIN${policySysIds}`;
    window.open(urlString, '_blank');
    console.log(urlString);
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

  return {
      fieldChart: fieldChart, 
      spfieldChart: spfieldChart,
      spGetSections: spGetSections,
      parseURL: parseURL,
      getSections: getSections,
      searchClientScripts: searchClientScripts,
      searchBusinessRules: searchBusinessRules,
      searchUiPolicies: searchUiPolicies,
      searchScripts: searchScripts
    };
})();