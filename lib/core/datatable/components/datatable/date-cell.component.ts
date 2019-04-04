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

import { Component, ViewEncapsulation } from '@angular/core';
import { DataTableCellComponent } from './datatable-cell.component';
import {
    UserPreferencesService,
    UserPreferenceValues
} from '../../../services/user-preferences.service';
import { AlfrescoApiService } from '../../../services/alfresco-api.service';
import { AppConfigService } from '../../../app-config/app-config.service';

@Component({
    selector: 'adf-date-cell',

    template: `
        <ng-container>
            <span
                [attr.aria-label]="value$ | async | adfTimeAgo: currentLocale"
                title="{{ tooltip | date: 'medium' }}"
                class="adf-datatable-cell-value"
                *ngIf="format === 'timeAgo'; else standard_date"
            >
                {{ value$ | async | adfTimeAgo: currentLocale }}
            </span>
        </ng-container>
        <ng-template #standard_date>
            <span
                class="adf-datatable-cell-value"
                title="{{ tooltip | date: format }}"
                [attr.aria-label]="value$ | async | date: format"
            >
                {{ value$ | async | date: format }}
            </span>
        </ng-template>
    `,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'adf-date-cell adf-datatable-cell' }
})
export class DateCellComponent extends DataTableCellComponent {
    currentLocale: string;
    dateFormat: string;

    get format(): string {
        if (this.column) {
            return this.column.format || this.dateFormat;
        }
        return this.dateFormat;
    }

    constructor(
        userPreferenceService: UserPreferencesService,
        alfrescoApiService: AlfrescoApiService,
        appConfig: AppConfigService
    ) {
        super(alfrescoApiService);

        this.dateFormat = appConfig.get('dateFormat');
        if (userPreferenceService) {
            userPreferenceService
                .select(UserPreferenceValues.Locale)
                .subscribe((locale) => {
                    this.currentLocale = locale;
                });
        }
    }
}
