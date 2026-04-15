import { SPFI } from '@pnp/sp';
import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IAppProps {
  sp: SPFI;
  context: WebPartContext;
  hasTeamsContext: boolean;
}
