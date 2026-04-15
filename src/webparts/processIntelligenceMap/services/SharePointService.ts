import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/files';
import '@pnp/sp/folders';
import { IListItemFormUpdateValue } from '@pnp/sp/lists';

// ─── List / library names ─────────────────────────────────────────────────────
export const LIST_PROCESS_MAPS    = 'ProcessMaps';
export const LIST_PROCESS_STEPS   = 'ProcessSteps';
export const LIST_PROCESS_LINKS   = 'ProcessLinks';
export const LIBRARY_ATTACHMENTS  = 'ProcessStepAttachments';

// ─── Process link type ────────────────────────────────────────────────────────
export interface IProcessLink {
  id: number;
  sourceStepId: number;
  targetStepId: number;
  processMapId: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface IProcessMap {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

// NOTE: field names map to SP internal column names as created by provision-browser-console.js.
//       stepName  → Title  (built-in)
//       description → StepDescription  (custom Note column)
export interface IProcessStep {
  id: number;
  processMapId: number;
  subprocessParentId: number | null;
  stepName: string;         // SP: Title
  owner: string;
  ownerEmail: string;
  manualOrAutomated: string;
  sortOrder: number;
  description: string;      // SP: StepDescription
  dataCollected: string;
  dataSource: string;
  transformation: string;
  output: string;
  nextPerson: string;
  nextPersonEmail: string;  // SP: NextPersonEmail (add column if not present)
  frequency: string;
  timeSpent: string;
  systemsTouched: string;
  painPoints: string;
}

export interface IAttachment {
  id: number;
  stepId: number;
  processMapId: number;
  fileName: string;
  fileUrl: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────
let _sp: SPFI;
let _webRelativeUrl = '';

export const SharePointService = {
  init(sp: SPFI, webRelativeUrl: string): void {
    _sp = sp;
    _webRelativeUrl = webRelativeUrl;
  },

  // ── Process Maps ────────────────────────────────────────────────────────────
  async getProcessMaps(): Promise<IProcessMap[]> {
    const items = await _sp.web.lists.getByTitle(LIST_PROCESS_MAPS)
      .items.filter('IsActive eq 1')
      .select('Id', 'Title', 'Description', 'IsActive')();
    return items.map(i => ({
      id: i.Id,
      name: i.Title,
      description: i.Description || '',
      isActive: i.IsActive,
    }));
  },

  async addProcessMap(name: string, description: string): Promise<IProcessMap> {
    const folderUrl = `${_webRelativeUrl}/Lists/${LIST_PROCESS_MAPS}`;
    const result = await _sp.web.lists.getByTitle(LIST_PROCESS_MAPS)
      .addValidateUpdateItemUsingPath([
        { FieldName: 'Title',       FieldValue: name },
        { FieldName: 'Description', FieldValue: description },
        { FieldName: 'IsActive',    FieldValue: '1' },
      ], folderUrl);
    const idEntry = Array.isArray(result) ? result.find(r => r.FieldName === 'Id') : null;
    const newId = idEntry ? parseInt(idEntry.FieldValue || '0', 10) : 0;
    return { id: newId, name, description, isActive: true };
  },

  async deleteProcessMap(id: number): Promise<void> {
    // Soft delete — set IsActive = false
    await _sp.web.lists.getByTitle(LIST_PROCESS_MAPS)
      .items.getById(id).validateUpdateListItem([{ FieldName: 'IsActive', FieldValue: '0' }]);
  },

  // ── Process Steps ────────────────────────────────────────────────────────────
  async getSteps(processMapId: number): Promise<IProcessStep[]> {
    const items = await _sp.web.lists.getByTitle(LIST_PROCESS_STEPS)
      .items.filter(`ProcessMapId eq ${processMapId}`)
      .orderBy('SortOrder')
      .select(
        'Id', 'Title', 'ProcessMapId', 'SubprocessParentId',
        'StepOwner', 'OwnerEmail', 'AutomationLevel', 'SortOrder',
        'StepDescription',
        'DataCollected', 'DataSource', 'Transformation', 'Output',
        'NextPerson',
        'StepFrequency', 'TimeSpent', 'SystemsTouched', 'PainPoints'
      )();
    return items.map(i => ({
      id: i.Id,
      processMapId: i.ProcessMapId,
      subprocessParentId: i.SubprocessParentId || null,
      stepName: i.Title,
      owner: i.StepOwner || '',
      ownerEmail: i.OwnerEmail || '',
      manualOrAutomated: i.AutomationLevel || 'Manual',
      sortOrder: i.SortOrder || 0,
      description: i.StepDescription || '',
      dataCollected: i.DataCollected || '',
      dataSource: i.DataSource || '',
      transformation: i.Transformation || '',
      output: i.Output || '',
      nextPerson: i.NextPerson || '',
      nextPersonEmail: '',  // column not provisioned — omitted from query
      frequency: i.StepFrequency || '',
      timeSpent: i.TimeSpent || '',
      systemsTouched: i.SystemsTouched || '',
      painPoints: i.PainPoints || '',
    }));
  },

  async addStep(step: Omit<IProcessStep, 'id'>): Promise<IProcessStep> {
    const s = (v: unknown): string => (v === null || v === undefined) ? '' : String(v);
    const i = (v: unknown): string => { const n = parseInt(String(v), 10); return isNaN(n) ? '0' : String(n); };

    // Use addValidateUpdateItemUsingPath — accepts all values as strings,
    // SP handles Int32 coercion server-side (avoids Edm.Int32 error from items.add)
    const folderUrl = `${_webRelativeUrl}/Lists/${LIST_PROCESS_STEPS}`;
    const formValues: IListItemFormUpdateValue[] = [
      { FieldName: 'Title',             FieldValue: s(step.stepName) },
      { FieldName: 'ProcessMapId',      FieldValue: i(step.processMapId) },
      { FieldName: 'StepOwner',         FieldValue: s(step.owner) },
      { FieldName: 'OwnerEmail',        FieldValue: s(step.ownerEmail) },
      { FieldName: 'AutomationLevel',   FieldValue: s(step.manualOrAutomated) },
      { FieldName: 'SortOrder',         FieldValue: i(step.sortOrder) },
      { FieldName: 'StepDescription',   FieldValue: s(step.description) },
      { FieldName: 'DataCollected',     FieldValue: s(step.dataCollected) },
      { FieldName: 'DataSource',        FieldValue: s(step.dataSource) },
      { FieldName: 'Transformation',    FieldValue: s(step.transformation) },
      { FieldName: 'Output',            FieldValue: s(step.output) },
      { FieldName: 'NextPerson',        FieldValue: s(step.nextPerson) },
      { FieldName: 'StepFrequency',      FieldValue: s(step.frequency) },
      { FieldName: 'TimeSpent',         FieldValue: s(step.timeSpent) },
      { FieldName: 'SystemsTouched',    FieldValue: s(step.systemsTouched) },
      { FieldName: 'PainPoints',        FieldValue: s(step.painPoints) },
    ];
    if (step.subprocessParentId !== null && step.subprocessParentId !== undefined) {
      formValues.push({ FieldName: 'SubprocessParentId', FieldValue: i(step.subprocessParentId) });
    }
    const result = await _sp.web.lists.getByTitle(LIST_PROCESS_STEPS)
      .addValidateUpdateItemUsingPath(formValues, folderUrl);
    // Throw on any field-level exception so the UI catch block shows the real error
    const errors = Array.isArray(result) ? result.filter(r => r.HasException) : [];
    if (errors.length > 0) {
      throw new Error('SP field errors: ' + errors.map(e => `${e.FieldName}: ${e.ErrorMessage}`).join('; '));
    }
    const idEntry = Array.isArray(result) ? result.find(r => r.FieldName === 'Id') : null;
    const newId = idEntry ? parseInt(idEntry.FieldValue || '0', 10) : (Array.isArray(result) ? (result[0]?.ItemId || 0) : 0);
    return { ...step, id: newId };
  },

  async updateStep(id: number, fields: Partial<Omit<IProcessStep, 'id'>>): Promise<void> {
    const s = (v: unknown): string => (v === null || v === undefined) ? '' : String(v);
    const n = (v: unknown): string => { const x = parseInt(String(v), 10); return isNaN(x) ? '0' : String(x); };
    const fv: IListItemFormUpdateValue[] = [];
    if (fields.stepName           !== undefined) fv.push({ FieldName: 'Title',           FieldValue: s(fields.stepName) });
    if (fields.processMapId       !== undefined) fv.push({ FieldName: 'ProcessMapId',    FieldValue: n(fields.processMapId) });
    if (fields.subprocessParentId !== undefined && fields.subprocessParentId !== null)
                                                 fv.push({ FieldName: 'SubprocessParentId', FieldValue: n(fields.subprocessParentId) });
    if (fields.owner              !== undefined) fv.push({ FieldName: 'StepOwner',        FieldValue: s(fields.owner) });
    if (fields.ownerEmail         !== undefined) fv.push({ FieldName: 'OwnerEmail',       FieldValue: s(fields.ownerEmail) });
    if (fields.manualOrAutomated  !== undefined) fv.push({ FieldName: 'AutomationLevel',  FieldValue: s(fields.manualOrAutomated) });
    if (fields.sortOrder          !== undefined) fv.push({ FieldName: 'SortOrder',        FieldValue: n(fields.sortOrder) });
    if (fields.description        !== undefined) fv.push({ FieldName: 'StepDescription',  FieldValue: s(fields.description) });
    if (fields.dataCollected      !== undefined) fv.push({ FieldName: 'DataCollected',    FieldValue: s(fields.dataCollected) });
    if (fields.dataSource         !== undefined) fv.push({ FieldName: 'DataSource',       FieldValue: s(fields.dataSource) });
    if (fields.transformation     !== undefined) fv.push({ FieldName: 'Transformation',   FieldValue: s(fields.transformation) });
    if (fields.output             !== undefined) fv.push({ FieldName: 'Output',           FieldValue: s(fields.output) });
    if (fields.nextPerson         !== undefined) fv.push({ FieldName: 'NextPerson',       FieldValue: s(fields.nextPerson) });
    if (fields.frequency          !== undefined) fv.push({ FieldName: 'StepFrequency',    FieldValue: s(fields.frequency) });
    if (fields.timeSpent          !== undefined) fv.push({ FieldName: 'TimeSpent',        FieldValue: s(fields.timeSpent) });
    if (fields.systemsTouched     !== undefined) fv.push({ FieldName: 'SystemsTouched',   FieldValue: s(fields.systemsTouched) });
    if (fields.painPoints         !== undefined) fv.push({ FieldName: 'PainPoints',       FieldValue: s(fields.painPoints) });
    if (fv.length === 0) return;
    await _sp.web.lists.getByTitle(LIST_PROCESS_STEPS).items.getById(id).validateUpdateListItem(fv);
  },

  async deleteStep(id: number): Promise<void> {
    await _sp.web.lists.getByTitle(LIST_PROCESS_STEPS).items.getById(id).delete();
  },

  // ── Attachments ──────────────────────────────────────────────────────────────
  async uploadAttachment(stepId: number, processMapId: number, file: File): Promise<IAttachment> {
    const folderUrl = `ProcessStepAttachments/step-${stepId}`;
    await _sp.web.folders.addUsingPath(folderUrl);
    const uploadResult = await _sp.web
      .getFolderByServerRelativePath(folderUrl)
      .files.addUsingPath(file.name, file, { Overwrite: true });
    const fileUrl = (uploadResult as unknown as { ServerRelativeUrl: string }).ServerRelativeUrl || '';
    const fileItem = await (uploadResult as unknown as { file: { getItem: () => Promise<{ validateUpdateListItem: (fv: IListItemFormUpdateValue[]) => Promise<IListItemFormUpdateValue[]>; select: (f: string) => { (): Promise<{ Id: number }> } }> } }).file.getItem();
    await fileItem.validateUpdateListItem([
      { FieldName: 'StepId',       FieldValue: String(stepId) },
      { FieldName: 'ProcessMapId', FieldValue: String(processMapId) },
    ]);
    const newItem = await fileItem.select('Id')();
    return { id: newItem.Id, stepId, processMapId, fileName: file.name, fileUrl };
  },

  async getAttachments(stepId: number): Promise<IAttachment[]> {
    const items = await _sp.web.lists.getByTitle(LIBRARY_ATTACHMENTS)
      .items.filter(`StepId eq ${stepId}`)
      .select('Id', 'Title', 'FileRef', 'StepId', 'ProcessMapId')();
    return items.map(i => ({
      id: i.Id,
      stepId: i.StepId,
      processMapId: i.ProcessMapId,
      fileName: i.Title,
      fileUrl: i.FileRef,
    }));
  },

  async deleteAttachment(id: number): Promise<void> {
    await _sp.web.lists.getByTitle(LIBRARY_ATTACHMENTS).items.getById(id).delete();
  },

  // ── Process Links ────────────────────────────────────────────────────────────
  async getLinks(processMapId: number): Promise<IProcessLink[]> {
    const items = await _sp.web.lists.getByTitle(LIST_PROCESS_LINKS)
      .items.filter(`ProcessMapId eq ${processMapId}`)
      .select('Id', 'SourceStepId', 'TargetStepId', 'ProcessMapId')();
    return items.map(i => ({
      id: i.Id,
      sourceStepId: i.SourceStepId,
      targetStepId: i.TargetStepId,
      processMapId: i.ProcessMapId,
    }));
  },

  async addLink(sourceStepId: number, targetStepId: number, processMapId: number): Promise<IProcessLink> {
    const folderUrl = `${_webRelativeUrl}/Lists/${LIST_PROCESS_LINKS}`;
    const result = await _sp.web.lists.getByTitle(LIST_PROCESS_LINKS)
      .addValidateUpdateItemUsingPath([
        { FieldName: 'SourceStepId', FieldValue: String(sourceStepId) },
        { FieldName: 'TargetStepId', FieldValue: String(targetStepId) },
        { FieldName: 'ProcessMapId', FieldValue: String(processMapId) },
      ], folderUrl);
    const errors = Array.isArray(result) ? result.filter(r => r.HasException) : [];
    if (errors.length > 0) throw new Error('SP link errors: ' + errors.map(e => `${e.FieldName}: ${e.ErrorMessage}`).join('; '));
    const idEntry = Array.isArray(result) ? result.find(r => r.FieldName === 'Id') : null;
    const newId = idEntry ? parseInt(idEntry.FieldValue || '0', 10) : 0;
    return { id: newId, sourceStepId, targetStepId, processMapId };
  },

  async deleteLink(id: number): Promise<void> {
    await _sp.web.lists.getByTitle(LIST_PROCESS_LINKS).items.getById(id).delete();
  },

  async deleteLinksForStep(stepId: number, processMapId: number): Promise<void> {
    const items = await _sp.web.lists.getByTitle(LIST_PROCESS_LINKS)
      .items.filter(`ProcessMapId eq ${processMapId} and (SourceStepId eq ${stepId} or TargetStepId eq ${stepId})`)
      .select('Id')();
    await Promise.all(items.map((i: { Id: number }) =>
      _sp.web.lists.getByTitle(LIST_PROCESS_LINKS).items.getById(i.Id).delete()
    ));
  },
};
