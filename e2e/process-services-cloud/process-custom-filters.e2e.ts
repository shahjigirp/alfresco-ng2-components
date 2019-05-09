/*!
 * @license
 * Copyright 2019 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import TestConfig = require('../test.config');

import {
    TasksService, QueryService, ProcessDefinitionsService, ProcessInstancesService,
    LoginSSOPage, ApiService, SettingsPage, StringUtil, IdentityService, RolesService
} from '@alfresco/adf-testing';
import { NavigationBarPage } from '../pages/adf/navigationBarPage';
import { ProcessCloudDemoPage } from '../pages/adf/demo-shell/process-services/processCloudDemoPage';
import { TasksCloudDemoPage } from '../pages/adf/demo-shell/process-services/tasksCloudDemoPage';
import { AppListCloudPage, LocalStorageUtil } from '@alfresco/adf-testing';
import resources = require('../util/resources');

import { browser, protractor } from 'protractor';
import CONSTANTS = require('../util/constants');
import { ProcessListCloudConfiguration } from './processListCloud.config';
import { EditProcessFilterConfiguration } from './editProcessFilter.config';

describe('Process list cloud', () => {

    const settingsPage = new SettingsPage();
    const loginSSOPage = new LoginSSOPage();
    const navigationBarPage = new NavigationBarPage();
    const appListCloudComponent = new AppListCloudPage();
    const processCloudDemoPage = new ProcessCloudDemoPage();
    const tasksCloudDemoPage = new TasksCloudDemoPage();

    let tasksService: TasksService;
    let processDefinitionService: ProcessDefinitionsService;
    let processInstancesService: ProcessInstancesService;
    let queryService: QueryService;
    let activitiUser, activitiUserRoleId;

    let completedProcess, runningProcessInstance, switchProcessInstance, noOfApps;
    const candidateuserapp = resources.ACTIVITI7_APPS.CANDIDATE_USER_APP.name;

    const apiService = new ApiService('activiti', TestConfig.adf.hostBPM, TestConfig.adf.hostSso, 'BPM');
    const identityService = new IdentityService(apiService);
    const rolesService = new RolesService(apiService);
    const processListCloudConfiguration = new ProcessListCloudConfiguration();
    const editProcessFilterConfiguration = new EditProcessFilterConfiguration();
    let processListCloudConfigFile, editProcessFilterConfigFile;

    beforeAll(async (done) => {
        settingsPage.setProviderBpmSso(TestConfig.adf.hostBPM, TestConfig.adf.hostSso, TestConfig.adf.hostIdentity, false);
        loginSSOPage.clickOnSSOButton();
        loginSSOPage.loginSSOIdentityService(TestConfig.adf.adminEmail, TestConfig.adf.adminPassword);
        processListCloudConfigFile = processListCloudConfiguration.getConfiguration();
        editProcessFilterConfigFile = editProcessFilterConfiguration.getConfiguration();

        await LocalStorageUtil.setConfigField('adf-edit-process-filter', JSON.stringify(editProcessFilterConfigFile));

        await LocalStorageUtil.setConfigField('adf-cloud-process-list', JSON.stringify(processListCloudConfigFile));

        await apiService.login(TestConfig.adf.adminEmail, TestConfig.adf.adminPassword);

        processDefinitionService = new ProcessDefinitionsService(apiService);
        const processDefinition = await processDefinitionService.getProcessDefinitions(candidateuserapp);

        processInstancesService = new ProcessInstancesService(apiService);
        await processInstancesService.createProcessInstance(processDefinition.list.entries[0].entry.key, candidateuserapp, {
            'name': StringUtil.generateRandomString(5),
            'businessKey': StringUtil.generateRandomString(5)
        });

        await processInstancesService.createProcessInstance(processDefinition.list.entries[1].entry.key, candidateuserapp, {
            'name': StringUtil.generateRandomString(5),
            'businessKey': StringUtil.generateRandomString(5)
        });

        runningProcessInstance = await processInstancesService.createProcessInstance(processDefinition.list.entries[0].entry.key, candidateuserapp, {
            'name': StringUtil.generateRandomString(5),
            'businessKey': StringUtil.generateRandomString(5)
        });
        switchProcessInstance = await processInstancesService.createProcessInstance(processDefinition.list.entries[0].entry.key, candidateuserapp, {
            'name': StringUtil.generateRandomString(5),
            'businessKey': StringUtil.generateRandomString(5)
        });

        completedProcess = await processInstancesService.createProcessInstance(processDefinition.list.entries[0].entry.key, candidateuserapp, {
            'name': StringUtil.generateRandomString(5),
            'businessKey': StringUtil.generateRandomString(5)
        });
        queryService = new QueryService(apiService);

        const task = await queryService.getProcessInstanceTasks(completedProcess.entry.id, candidateuserapp);
        tasksService = new TasksService(apiService);
        const claimedTask = await tasksService.claimTask(task.list.entries[0].entry.id, candidateuserapp);
        await tasksService.completeTask(claimedTask.entry.id, candidateuserapp);

        activitiUser = await identityService.createIdentityUser();
        activitiUserRoleId = await rolesService.getRoleIdByRoleName(CONSTANTS.ROLES.ACTIVITI_USER);
        await identityService.assignRole(activitiUser.idIdentityService, activitiUserRoleId, CONSTANTS.ROLES.ACTIVITI_USER);
        await apiService.login(activitiUser.email, activitiUser.password);

        processInstancesService = new ProcessInstancesService(apiService);
        await processInstancesService.createProcessInstance(processDefinition.list.entries[0].entry.key, candidateuserapp, {
            'name': StringUtil.generateRandomString(5),
            'businessKey': StringUtil.generateRandomString(5)
        });

        await apiService.login(TestConfig.adf.adminEmail, TestConfig.adf.adminPassword);
        done();
    });

    afterAll(async () => {
        await identityService.deleteIdentityUser(activitiUser.idIdentityService);
    });

    describe('Process List', () => {

        beforeEach(async (done) => {
            navigationBarPage.navigateToProcessServicesCloudPage();
            appListCloudComponent.checkApsContainer();
            appListCloudComponent.goToApp(candidateuserapp);
            tasksCloudDemoPage.taskListCloudComponent().checkTaskListIsLoaded();
            processCloudDemoPage.clickOnProcessFilters();
            done();
        });

        it('[C290069] Should display processes ordered by name when Name is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('RUNNING')
                .setSortFilterDropDown('Name').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsNameColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsNameColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C291783] Should display processes ordered by id when Id is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('RUNNING')
                .setSortFilterDropDown('Id').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.getAllRowsByIdColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.getAllRowsByIdColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C305054] Should display processes ordered by status when Status is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('ALL')
                .setSortFilterDropDown('Status').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsStatusColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsStatusColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        // bug raised for this ACTIVITI-3046
        xit('[C305054] Should display processes ordered by start date when StartDate is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('ALL')
                .setSortFilterDropDown('StartDate').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsStartDateColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsStartDateColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C305054] Should display processes ordered by initiator date when Initiator is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('ALL')
                .setSortFilterDropDown('Initiator').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsInitiatorColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsInitiatorColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C305054] Should display processes ordered by processdefinitionid date when ProcessDefinitionId is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('ALL')
                .setSortFilterDropDown('ProcessDefinitionId').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsProcessDefinitionIdColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsProcessDefinitionIdColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C305054] Should display processes ordered by processdefinitionkey date when ProcessDefinitionKey is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('ALL')
                .setSortFilterDropDown('ProcessDefinitionKey').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsProcessDefinitionKeyColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsProcessDefinitionKeyColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C305054] Should display processes ordered by last modified date when Last Modified is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('ALL')
                .setSortFilterDropDown('LastModified').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsLastModifiedColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsLastModifiedColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C305054] Should display processes ordered by business key date when BusinessKey is selected from sort dropdown', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().setStatusFilterDropDown('ALL')
                .setSortFilterDropDown('BusinessKey').setOrderFilterDropDown('ASC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsBusinessKeyColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });

            processCloudDemoPage.editProcessFilterCloudComponent().setOrderFilterDropDown('DESC');
            processCloudDemoPage.processListCloudComponent().getDataTable().checkSpinnerIsDisplayed().checkSpinnerIsNotDisplayed();
            processCloudDemoPage.processListCloudComponent().getAllRowsBusinessKeyColumn().then(function (list) {
                const initialList = list.slice(0);
                list.sort(function (firstStr, secondStr) {
                    return firstStr.localeCompare(secondStr);
                });
                list.reverse();
                expect(JSON.stringify(initialList) === JSON.stringify(list)).toEqual(true);
            });
        });

        it('[C305054] Should display the actions filters Save, SaveAs and Delete', async () => {
            processCloudDemoPage.allProcessesFilter().clickProcessFilter();
            processCloudDemoPage.allProcessesFilter().checkProcessFilterIsDisplayed();
            expect(processCloudDemoPage.getActiveFilterName()).toBe('All Processes');
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader();
            processCloudDemoPage.editProcessFilterCloudComponent().checkSaveButtonIsDisplayed().checkSaveAsButtonIsDisplayed()
                .checkDeleteButtonIsDisplayed();
        });

        it('[C297697] The value of the filter should be preserved when saving it', async () => {
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader()
                .setProcessInstanceId(completedProcess.entry.id);

            processCloudDemoPage.editProcessFilterCloudComponent().clickSaveAsButton();
            processCloudDemoPage.editProcessFilterCloudComponent().editProcessFilterDialog().setFilterName('New').clickOnSaveButton();
            expect(processCloudDemoPage.getActiveFilterName()).toBe('New');

            processCloudDemoPage.processListCloudComponent().checkContentIsDisplayedById(completedProcess.entry.id);
            expect(processCloudDemoPage.processListCloudComponent().getDataTable().numberOfRows()).toBe(1);

            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader();
            expect(processCloudDemoPage.editProcessFilterCloudComponent().getProcessInstanceId()).toEqual(completedProcess.entry.id);
        });

        it('[C297646] Should display the filter dropdown fine , after switching between saved filters', async () => {

            noOfApps = processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader().getNumberOfAppNameOptions();
            expect(processCloudDemoPage.editProcessFilterCloudComponent().checkAppNamesAreUnique()).toBe(true);
            browser.actions().sendKeys(protractor.Key.ESCAPE).perform();
            processCloudDemoPage.editProcessFilterCloudComponent().setStatusFilterDropDown('RUNNING')
                .setAppNameDropDown(candidateuserapp).setProcessInstanceId(runningProcessInstance.entry.id);

            processCloudDemoPage.processListCloudComponent().checkContentIsDisplayedById(runningProcessInstance.entry.id);
            expect(processCloudDemoPage.editProcessFilterCloudComponent().getNumberOfAppNameOptions()).toBe(noOfApps);
            expect(processCloudDemoPage.editProcessFilterCloudComponent().checkAppNamesAreUnique()).toBe(true);
            browser.actions().sendKeys(protractor.Key.ESCAPE).perform();

            processCloudDemoPage.editProcessFilterCloudComponent().clickSaveAsButton();
            processCloudDemoPage.editProcessFilterCloudComponent().editProcessFilterDialog().setFilterName('SavedFilter').clickOnSaveButton();
            expect(processCloudDemoPage.getActiveFilterName()).toBe('SavedFilter');

            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader();
            expect(processCloudDemoPage.editProcessFilterCloudComponent().getProcessInstanceId()).toEqual(runningProcessInstance.entry.id);

            processCloudDemoPage.editProcessFilterCloudComponent().setStatusFilterDropDown('RUNNING')
                .setAppNameDropDown(candidateuserapp).setProcessInstanceId(switchProcessInstance.entry.id);

            processCloudDemoPage.processListCloudComponent().checkContentIsDisplayedById(switchProcessInstance.entry.id);
            processCloudDemoPage.editProcessFilterCloudComponent().clickSaveAsButton();
            processCloudDemoPage.editProcessFilterCloudComponent().editProcessFilterDialog().setFilterName('SwitchFilter').clickOnSaveButton();
            expect(processCloudDemoPage.getActiveFilterName()).toBe('SwitchFilter');

            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader();
            expect(processCloudDemoPage.editProcessFilterCloudComponent().getProcessInstanceId()).toEqual(switchProcessInstance.entry.id);
            expect(processCloudDemoPage.editProcessFilterCloudComponent().getNumberOfAppNameOptions()).toBe(noOfApps);
            expect(processCloudDemoPage.editProcessFilterCloudComponent().checkAppNamesAreUnique()).toBe(true);
            browser.actions().sendKeys(protractor.Key.ESCAPE).perform();
        });
    });

    describe('Process List - Check Action Filters', () => {

        beforeEach(async (done) => {
            await LocalStorageUtil.setConfigField('adf-edit-process-filter', JSON.stringify({
                'actions': [
                    'save',
                    'saveAs'
                ]
            }));
            navigationBarPage.navigateToProcessServicesCloudPage();
            appListCloudComponent.checkApsContainer();
            appListCloudComponent.goToApp(candidateuserapp);
            tasksCloudDemoPage.taskListCloudComponent().checkTaskListIsLoaded();
            processCloudDemoPage.clickOnProcessFilters();
            done();
        });

        it('[C305054] Should display the actions filters Save and SaveAs, Delete button is not displayed', async () => {
            processCloudDemoPage.allProcessesFilter().clickProcessFilter();
            processCloudDemoPage.allProcessesFilter().checkProcessFilterIsDisplayed();
            expect(processCloudDemoPage.getActiveFilterName()).toBe('All Processes');
            processCloudDemoPage.editProcessFilterCloudComponent().clickCustomiseFilterHeader();
            processCloudDemoPage.editProcessFilterCloudComponent().checkSaveButtonIsDisplayed().checkSaveAsButtonIsDisplayed()
                .checkDeleteButtonIsNotDisplayed();
        });

    });
});
