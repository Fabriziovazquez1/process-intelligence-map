// Paste this into the browser console while on your SharePoint site.
// Creates the ProcessLinks list used for branching step connections.

(async () => {
  const siteUrl = 'https://spo.aptiv.com/sites/0906-SCMEDSSharePoint';
  const api     = `${siteUrl}/_api/web`;

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

  async function fieldExists(listTitle, internalName) {
    const r = await fetch(
      `${api}/lists/getbytitle('${encodeURIComponent(listTitle)}')/fields?$filter=InternalName eq '${internalName}'`,
      { headers: h, credentials: 'include' }
    );
    const d = await r.json();
    return d.value && d.value.length > 0;
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
    await fetch(
      `${api}/lists/getbytitle('${encodeURIComponent(listTitle)}')/views/getbytitle('All Items')/viewfields/addviewfield('${internalName}')`,
      { method: 'POST', headers: h, credentials: 'include' }
    );
  }

  console.log('\n── ProcessLinks ────────────────────────────────');
  if (!(await listExists('ProcessLinks'))) {
    const r = await fetch(`${api}/lists`, {
      method: 'POST', headers: h, credentials: 'include',
      body: JSON.stringify({ Title: 'ProcessLinks', Description: 'Directed links between process steps', BaseTemplate: 100 })
    });
    if (!r.ok) { console.error('✗ Failed to create ProcessLinks:', await r.text()); return; }
    console.log('✓ Created list: ProcessLinks');
  } else {
    console.log('  ↳ Already exists: ProcessLinks');
  }

  await addField('ProcessLinks', 'SourceStepId', 'SourceStepId', 9); // Number
  await addField('ProcessLinks', 'TargetStepId', 'TargetStepId', 9); // Number
  await addField('ProcessLinks', 'ProcessMapId', 'ProcessMapId', 9); // Number

  console.log('\n══════════════════════════════════════════════════');
  console.log('✓ Done. Verify at:');
  console.log(`  ${siteUrl}/Lists/ProcessLinks`);
  console.log('══════════════════════════════════════════════════');
})();
