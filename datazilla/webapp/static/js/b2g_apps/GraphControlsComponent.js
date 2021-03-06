/*******
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * *****/
var GraphControlsComponent = new Class({

    Extends: Component,

    jQuery:'GraphControlsComponent',

    initialize: function(selector, options){

        this.setOptions(options);

        this.parent(options);

        this.view = new GraphControlsView();
        this.model = new GraphControlsModel();

        this.appSortOrder = [];
        this.appLookup = {};
        this.testLookup = {};
        this.branchLookup = {};

        if(APPS_PAGE.defaults['range'] != undefined){
            this.view.selectDefaultTimeRange( APPS_PAGE.defaults['range'] );
        }

        this.model.getApps(this, this.initializeAppList);

        this.appToggleEvent = 'APP_TOGGLE_EV';
        this.testToggleEvent = 'TEST_TOGGLE_EV';

        $(APPS_PAGE.appContainerSel).bind(
            APPS_PAGE.stateChangeEvent,
            _.bind(this.stateChange, this)
            );
    },
    initializeAppList: function(data){

        //Change name of email app to email FTU.
        //This should be removed once the email application
        //is a full featured email app and not a first time use
        //application.
        if( data['email'] != undefined ){

            var oldEmailName = 'email';
            var newEmailName = 'email FTU';

            data['email']['name'] = newEmailName;
            data[ newEmailName ] = jQuery.extend(
                true, {}, data[oldEmailName]);

            delete data[oldEmailName];
        }


        this.appSortOrder = this.view.getAlphabeticalSortKeys(data);
        var colorIndex = 0;
        var colorCount = this.view.colors.length - 1;
        var hexColor = "";

        for(var i=0; i<this.appSortOrder.length; i++){

            var seriesDatum = data[ this.appSortOrder[i] ];

            if( APPS_PAGE.excludeList[ seriesDatum.name ] != undefined ){

                delete this.appSortOrder[i];

                continue;
            }

            if(colorIndex > colorCount){
                colorIndex = 0;
            }

            hexColor = this.view.colors[colorIndex];
            colorIndex++;

            this.view.getSeriesLabel(
                this.view.datasetLegendSel, hexColor, seriesDatum,
                this.toggleAppSeries, this, this.view.appSeriesContainerSel,
                this.view.appSeriesIdPrefix, true
                );

            seriesDatum['color'] = hexColor;
            this.appLookup[ seriesDatum.id ] = seriesDatum;
            this.appLookup[ seriesDatum.name ] = seriesDatum;
        }

        this.appSortOrder = _.compact(this.appSortOrder);

        this.model.getBranches(this, this.initializeBranchList);
        this.model.getDeviceTypes(this, this.initializeDeviceList);

    },
    initializeDeviceList: function(data){

        var deviceTypes = {};
        var keys = _.keys(data);
        var type = "";

        for(var i = 0; i<keys.length; i++){
            if(data[ keys[i] ][ 'type' ] != undefined){
                type = data[ keys[i] ][ 'type' ];
                if(deviceTypes[type] === undefined){
                    deviceTypes[type] = true;
                    this.view.addDevice(type);
                }
            }
        }

        //If we don't get a machine type use the default
        if(_.isEmpty(deviceTypes)){
            this.view.addDevice(this.view.defaultDeviceOption);
        }
    },
    initializeBranchList: function(data){

        var keys = _.keys(data).sort();

        var branch = "";
        var i = 0;

        for(i = 0; i<keys.length; i++){

            branch = data[ keys[i] ].branch;
            if(this.branchLookup[branch] === undefined){
                this.branchLookup[branch] = true;
                this.view.addBranch(branch);
            }
        }

        //Make sure apps and branches are loaded before tests are initialized
        this.model.getTests(this, this.initializeTestList);
    },
    initializeTestList: function(data){

        var sortOrder = this.view.getAlphabeticalSortKeys(data);

        for(var i=0; i<sortOrder.length; i++){

            var seriesDatum = data[ sortOrder[i] ];

            if( APPS_PAGE.excludeList[ seriesDatum.url ] != undefined){
                continue;
            }

            this.view.getSeriesLabel(
                this.view.datasetTestLegendSel, this.view.testColor,
                seriesDatum, this.toggleTestSeries, this,
                this.view.testSeriesContainerSel,
                this.view.testSeriesIdPrefix
                );

            this.testLookup[ seriesDatum.id ] = seriesDatum;
            this.testLookup[ seriesDatum.url ] = seriesDatum;
        }

        var inputEls = $(this.view.testSeriesContainerSel).find('input');

        //Select default test
        if(APPS_PAGE.defaults['test'] != undefined){

            var i = 0;
            var testName = "";

            for(i=0; i<inputEls.length; i++){

                testName = $(inputEls[i]).next().text();
                if(APPS_PAGE.defaults['test'] === testName){
                    $(inputEls[i]).click();
                    return;
                }
            }

            //If we make here no match was found for the test name
            //carry out default behavior so we load something
            $(inputEls[0]).click();

        }else{
            $(inputEls[0]).click();
        }

    },
    stateChange: function(event, data){

        if(data['test'] != undefined){

            this.selectTest(data['test']);

        }else if(data['app_list'] != undefined){

            var i=0;
            var appName = "";
            var datum = {};
            var id = "";
            var appSel = "";
            var inputSel = "";
            var checkedAllowed = {};

            //Disable individual toggling events from getting
            //added to history
            APPS_PAGE.disableSaveState = true;

            //make sure apps in the app_list are checked
            for(i=0; i<data['app_list'].length; i++){

                appName = data['app_list'][i];
                datum = this.appLookup[ appName ];
                checkedAllowed[datum.id] = true;

                appSel = this.view.getAppSeriesSel(datum.id);
                inputSel = $(appSel).find('input');

                if( !$(inputSel).is(':checked') ){
                    $(inputSel).click();
                }
            }

            //Make sure no other apps are checked
            var inputEls = $(this.view.appSeriesContainerSel).find(
                'input:checked');

            var j=0;
            var idAttr = "";
            var id = "";

            for(j=0; j<inputEls.length; j++){

                idAttr = $(inputEls[j]).parent().attr('id');
                id = this.view.getId(idAttr);

                if( checkedAllowed[id] === undefined ){

                    if($(inputEls[j]).is(':checked') ){
                        $(inputEls[j]).click();
                    }
                }
            }

            //Reenable saveState
            APPS_PAGE.disableSaveState = false;

        }
    },
    displayApps: function(includeApps){

        for(var i=0; i<this.appSortOrder.length; i++){
            var seriesDatum = this.appLookup[ this.appSortOrder[i] ];

            var appSeriesSel = this.view.getAppSeriesSel(seriesDatum.id);

            if( includeApps[ seriesDatum.name ] != undefined ){
                $(appSeriesSel).css('display', 'block');
            }else{
                $(appSeriesSel).css('display', 'none');
            }
        }
    },
    toggleAppSeries: function(event){

        var idAttr = $(event.currentTarget).parent().attr('id');
        var id = this.view.getId(idAttr);

        $(APPS_PAGE.appContainerSel).trigger(
            this.appToggleEvent,
            { 'test_id':id }
            );

    },
    toggleTestSeries: function(event){

        var idAttr = $(event.currentTarget).parent().attr('id');
        var id = this.view.getId(idAttr);

        var eventData = this.testLookup[id];

        this.view.selectApplications(eventData.test_ids);

        for( var tId in eventData['test_ids'] ){
            if(this.appLookup[tId] != undefined){
                eventData['test_ids'][ tId ] = {
                    'name':this.appLookup[ tId ]['name'],
                    'color':this.appLookup[ tId ]['color']
                    };
            }
        }

        $(APPS_PAGE.appContainerSel).trigger(
            this.testToggleEvent, eventData
            );

    },
    selectTest: function(testName){


        var datum = this.testLookup[testName];

        if(_.isEmpty(datum)){

            var inputEls = $(this.view.testSeriesContainerSel).find('input');
            $(inputEls[0]).click();

        }else{

            var elSel = this.view.getTestSeriesSel(datum.id);
            $(elSel).find('input').click();
        }

    }
});
var GraphControlsView = new Class({

    Extends:View,

    jQuery:'GraphControlsView',

    initialize: function(selector, options){

        this.setOptions(options);

        this.parent(options);

        this.appSeriesContainerSel = '#app_series';
        this.testSeriesContainerSel = '#test_series';

        this.branchSelectMenuSel = '#app_branch';
        this.deviceSelectMenuSel = '#app_device';

        this.idRegex = /^.*_(\d+)$/;

        this.colors = [
            '#0b3b40', '#99911c', '#a66247', '#7989b3', '#8bccc4', '#a35dd9', '#ff622e', '#cc8bc7', '#2254bf', '#22bf90', '#666345', '#ffbead', '#481059', '#2c96f2', '#10593d', '#ffc42e', '#4c1a0e', '#add9ff', '#196612', '#332409', '#604e73', '#103859', '#3dbf22', '#7f5717', '#462eff', '#1e84a6', '#88b379', '#f2cea5', '#1e1ea6', '#2cdbf2', '#d4f22c', '#e58729', '#091233', '#a61e88', '#ff2ee3', '#f2eba5'
            ];

        this.testColor = '#5CB2CB';

        this.defaultBranchOption = 'master';
        this.defaultDeviceOption = 'hamachi';

        if(APPS_PAGE.defaults['branch'] != undefined){
            this.defaultBranchOption = APPS_PAGE.defaults['branch'];
        }

        if(APPS_PAGE.defaults['device'] != undefined){
            this.defaultDeviceOption = APPS_PAGE.defaults['device'];
        }

        //series label ids
        this.datasetLegendSel = '#su_legend';
        this.datasetTestLegendSel = '#su_test_legend';
        this.timeRangeSel = '#app_time_range';
        this.selectAllAppsSel = '#app_select_apps';
        this.datasetTitleName = 'su_dataset_title';
        this.datasetCbContainerName = 'su_dataset_cb';
        this.datasetCloseName = 'su_dataset_close';
        this.appSeriesIdPrefix = 'app_series_';
        this.testSeriesIdPrefix = 'test_series_';

        $(this.selectAllAppsSel).bind(
            'click', _.bind(this.toggleAllApps, this)
            );
    },
    toggleAllApps: function(event){

        var checked = $(event.target).is(':checked');

        var inputEls = $(this.appSeriesContainerSel).find('input');

        //Disable individual toggling events from getting
        //added to history
        APPS_PAGE.disableSaveState = true;

        for(var i=0; i<inputEls.length; i++){

            var el = inputEls[i];

            if(checked){

                if( !$(el).is(':checked') ){
                    $(el).click();
                }

            }else {

                if( $(el).is(':checked') ){
                    $(el).click();
                }

            }
        }

        APPS_PAGE.disableSaveState = false;

        //Save the new application selection state
        APPS_PAGE.saveState(true);

    },
    selectApplications: function(testIds){

        var inputEls = $(this.appSeriesContainerSel).find('input');
        var inputEl = "";
        var idAttr = "";
        var id = "";
        var checked = "";

        var defaultApp = APPS_PAGE.defaults['app'];
        var appLookup = APPS_PAGE.defaults['app_list'] || {};

        if(defaultApp != undefined){
            appLookup[defaultApp] = true;
        }

        for(var i=0; i<inputEls.length; i++){

            inputEl = inputEls[i];
            idAttr = $(inputEl).parent().attr('id');
            checked = $(inputEl).attr('checked');
            id = this.getId(idAttr);

            if(id in testIds){

                var appName = $(inputEl).next().text();

                if( !_.isEmpty(appLookup) ){
                    if( appLookup[appName] === true ){
                        //If a default app name has been specified in the params
                        //only click on it
                        if(!checked){
                            $(inputEl).click();
                        }
                    }

                }else{

                    if(!checked){
                        $(inputEl).click();
                    }
                }
            }else{
                $('#' + idAttr).css('display', 'none');
            }
        }
    },
    getSeriesLabel: function(
        legendIdSel, hexColor, seriesDatum, fnCallback, context,
        containerSel, idPrefix, noDisplay
        ){

        var rgbAlpha = this.hexToRgb(hexColor);

        var label = "";
        if(seriesDatum['url'] != undefined){
            label = seriesDatum.url;
        }else{
            label = seriesDatum.name;
        }

        var labelClone = $(legendIdSel).parent().clone();
        var legendClone = $(labelClone).children();

        $(legendClone).attr(
            'id', idPrefix + seriesDatum.id
            );

        var inputEl = $(legendClone).find('input');
        $(inputEl).bind('click', _.bind( fnCallback, context ) );

        var titleDiv = $(legendClone).find(
            '[name="' + this.datasetTitleName + '"]'
            );

        $(titleDiv).text( label );

        $(legendClone).css('background-color', rgbAlpha);
        $(legendClone).css('border-color', hexColor);
        $(legendClone).css('border-width', 1);

        if(noDisplay != true){
            $(legendClone).css('display', 'block');
        }

        $(legendClone).hover(
            function(){
                //On mouseOver
                $(this).css('background-color', '#FFFFFF');
            },
            function(){
                //On mouseOut
                $(this).css('background-color', rgbAlpha);
            }
        );

        $(containerSel).append(labelClone);

    },
    getId: function(idAttr){
        var id = "";
        if(idAttr != undefined){
            var idMatch = this.idRegex.exec(idAttr);
            if(idMatch && idMatch.length === 2){
                id = idMatch[1];
            }
        }
        return id;
    },
    addBranch: function(branch){
        var optionEl = $('<option></option>');
        $(optionEl).attr('value', branch);

        if(branch === this.defaultBranchOption){
            $(optionEl).attr('selected', 'selected');
        }

        $(optionEl).text(branch);
        $(this.branchSelectMenuSel).append(optionEl);
    },
    addDevice: function(device){
        var optionEl = $('<option></option>');
        $(optionEl).attr('value', device);

        if(device === this.defaultDeviceOption){
            $(optionEl).attr('selected', 'selected');
        }

        $(optionEl).text(device);
        $(this.deviceSelectMenuSel).append(optionEl);
    },
    selectDefaultTimeRange: function(range){
        var optionEl = $(this.timeRangeSel).find('[value="' + range + '"]');
        $(optionEl).attr('selected', 'selected');
    },
    getAppSeriesSel: function(id){
        return '#' + this.appSeriesIdPrefix + id;
    },
    getTestSeriesSel: function(id){
        return '#' + this.testSeriesIdPrefix + id;
    }
});
var GraphControlsModel = new Class({

    Extends:Model,

    jQuery:'GraphControlsModel',

    initialize: function(options){

        this.setOptions(options);

        this.parent(options);

    },

    getDeviceTypes: function(context, fnSuccess){

        var uri = APPS_PAGE.urlBase + 'refdata/perftest/ref_data/machines';

        jQuery.ajax( uri, {
            accepts:'application/json',
            dataType:'json',
            cache:false,
            type:'GET',
            data:data,
            context:context,
            success:fnSuccess,
        });
    },
    getBranches: function(context, fnSuccess){

        var uri = APPS_PAGE.urlBase + 'refdata/perftest/ref_data/products';

        jQuery.ajax( uri, {
            accepts:'application/json',
            dataType:'json',
            cache:false,
            type:'GET',
            data:data,
            context:context,
            success:fnSuccess,
        });
    },
    getApps: function(context, fnSuccess){

        var uri = APPS_PAGE.urlBase + 'refdata/perftest/ref_data/tests';

        jQuery.ajax( uri, {
            accepts:'application/json',
            dataType:'json',
            cache:false,
            type:'GET',
            data:data,
            context:context,
            success:fnSuccess,
        });
    },

    getTests: function(context, fnSuccess){

        var uri = APPS_PAGE.urlBase + 'refdata/perftest/ref_data/pages';

        jQuery.ajax( uri, {
            accepts:'application/json',
            dataType:'json',
            cache:false,
            type:'GET',
            data:data,
            context:context,
            success:fnSuccess,
        });
    }
});
