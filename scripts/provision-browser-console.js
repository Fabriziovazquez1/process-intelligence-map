// Paste this entire script into the browser console while on your SharePoint site.
// It uses your existing login session — no app registration needed.

(async () => {
  const siteUrl = 'https://spo.aptiv.com/sites/0906-SCMEDSSharepoint';
  const api     = `${siteUrl}/_api/web`;

  // Get form digest (request token) from SharePoint page context
  const digestRes = await fetch(`${siteUrl}/_api/contextinfo`, {
    method: 'POST',
    headers: { Accept: 'application/json;odata=nometadata', 'Content-Length': '0' },
    credentials: 'include'
  });
  const { FormDigestValue } = await digestRes.json();
  console.log('✓ Got session token');

  const h = {
    Accept: 'application/json;odata=nometadata',
    'Content-Type': 'application/json;odata=nometadata',
    'X-RequestDigest': FormDigestValue
  };

  async function listExists(title) {
    try {
      const r = await fetch(`${api}/lists/getbytitle('${encodeURIComponent(title)}')`, { headers: h, credentials: 'include' });
      return r.ok;
    } catch { return false; }
  }

  async function createList(title, description) {
    const r = await fetch(`${api}/lists`, {
      method: 'POST', headers: h, credentials: 'include',
      body: JSON.stringify({ Title: title, Description: description, BaseTemplate: 100 })
    });
    if (!r.ok) { console.error(`✗ Failed to create ${title}:`, await r.text()); return false; }
    console.log(`✓ Created list: ${title}`);
    return true;
  }

  async function fieldExists(listTitle, internalName) {
    const r = await fetch(
      `${api}/lists/getbytitle('${encodeURIComponent(listTitle)}')/fields?$filter=InternalName eq '${internalName}'`,
      { headers: h, credentials: 'include' }
    );
    const d = await r.json();
    return d.value && d.value.length > 0;
  }

  async function addFieldToView(listTitle, internalName) {
    await fetch(
      `${api}/lists/getbytitle('${encodeURIComponent(listTitle)}')/views/getbytitle('All Items')/viewfields/addviewfield('${internalName}')`,
      { method: 'POST', headers: h, credentials: 'include' }
    );
  }

  async function addField(listTitle, internalName, displayName, typeKind) {
    const exists = await fieldExists(listTitle, internalName);
    if (!exists) {
      const r = await fetch(`${api}/lists/getbytitle('${encodeURIComponent(listTitle)}')/fields`, {
        method: 'POST', headers: h, credentials: 'include',
        body: JSON.stringify({ Title: displayName, FieldTypeKind: typeKind, InternalName: internalName })
      });
      if (!r.ok) { console.error(`  ✗ Failed to add ${internalName}:`, await r.text()); return; }
      console.log(`  ✓ Created: ${internalName}`);
    } else {
      console.log(`  ↳ Already exists: ${internalName}`);
    }
    // Always ensure the field is in the view
    await addFieldToView(listTitle, internalName);
  }

  // ── ProcessMaps ──────────────────────────────────────────────────────────
  console.log('\n── ProcessMaps ─────────────────────────────────');
  if (!(await listExists('ProcessMaps'))) await createList('ProcessMaps', 'Top-level process maps');
  else console.log('  ↳ Already exists: ProcessMaps');
  await addField('ProcessMaps', 'Description', 'Description', 3); // Note
  await addField('ProcessMaps', 'IsActive',    'IsActive',    8); // Boolean

  // ── ProcessSteps ─────────────────────────────────────────────────────────
  console.log('\n── ProcessSteps ────────────────────────────────');
  if (!(await listExists('ProcessSteps'))) await createList('ProcessSteps', 'Steps within each process map');
  else console.log('  ↳ Already exists: ProcessSteps');
  await addField('ProcessSteps', 'ProcessMapId',       'ProcessMapId',       9); // Number
  await addField('ProcessSteps', 'SubprocessParentId', 'SubprocessParentId', 9); // Number
  await addField('ProcessSteps', 'Owner',              'Owner',              2); // Text
  await addField('ProcessSteps', 'OwnerEmail',         'OwnerEmail',         2); // Text
  await addField('ProcessSteps', 'ManualOrAutomated',  'ManualOrAutomated',  2); // Text
  await addField('ProcessSteps', 'SortOrder',          'SortOrder',          9); // Number
  await addField('ProcessSteps', 'StepDescription',    'StepDescription',    3); // Note (multiline)
  await addField('ProcessSteps', 'DataCollected',      'DataCollected',      2); // Text
  await addField('ProcessSteps', 'DataSource',         'DataSource',         2); // Text
  await addField('ProcessSteps', 'Transformation',     'Transformation',     2); // Text
  await addField('ProcessSteps', 'Output',             'Output',             2); // Text
  await addField('ProcessSteps', 'NextPerson',         'NextPerson',         2); // Text
  await addField('ProcessSteps', 'Frequency',          'Frequency',          2); // Text
  await addField('ProcessSteps', 'TimeSpent',          'TimeSpent',          2); // Text
  await addField('ProcessSteps', 'SystemsTouched',     'SystemsTouched',     3); // Note (multiline)
  await addField('ProcessSteps', 'PainPoints',         'PainPoints',         3); // Note (multiline)

  console.log('\n══════════════════════════════════════════════════');
  console.log('✓ Done. Check your site:');
  console.log(`  ${siteUrl}/Lists/ProcessMaps`);
  console.log(`  ${siteUrl}/Lists/ProcessSteps`);
  console.log('══════════════════════════════════════════════════');
})();
