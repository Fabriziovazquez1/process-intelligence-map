import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPFI, spfi } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/files';
import '@pnp/sp/folders';
import { SPFx } from '@pnp/sp/presets/all';

import App from './components/App';
import { IAppProps } from './components/IAppProps';

export interface IProcessIntelligenceMapWebPartProps {
  siteUrl: string;
}

export default class ProcessIntelligenceMapWebPart extends BaseClientSideWebPart<IProcessIntelligenceMapWebPartProps> {
  private _sp: SPFI;

  public onInit(): Promise<void> {
    this._sp = spfi().using(SPFx(this.context));
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IAppProps> = React.createElement(App, {
      sp: this._sp,
      context: this.context,
      hasTeamsContext: !!this.context.sdks.microsoftTeams
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'Process Intelligence Map Settings' },
          groups: [
            {
              groupName: 'Settings',
              groupFields: [
                PropertyPaneTextField('siteUrl', {
                  label: 'SharePoint Site URL (leave blank to use current site)'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
