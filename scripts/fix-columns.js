// Paste this into the browser console while on your SharePoint site.
// It deletes the 3 incorrectly-typed columns and recreates them as Text,
// renaming Owner→StepOwner, ManualOrAutomated→AutomationLevel, Frequency→StepFrequency
// to avoid conflicts with SharePoint built-in field names.

(async () => {
  const siteUrl = 'https://spo.aptiv.com/sites/0906-SCMEDSSharePoint';
  const listName = 'ProcessSteps';
  const api = `${siteUrl}/_api/web/lists/getbytitle('${listName}')`;

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

  // Delete a field by internal name (ignore errors if it doesn't exist)
  async function deleteField(internalName) {
    const r = await fetch(`${api}/fields/getbyinternalnameoretitle('${internalName}')`, {
      method: 'DELETE',
      headers: { ...h, 'IF-MATCH': '*', 'X-HTTP-Method': 'DELETE' },
      credentials: 'include'
    });
    if (r.ok || r.status === 404) {
      console.log(`  ✓ Deleted (or not found): ${internalName}`);
    } else {
      const txt = await r.text();
      console.warn(`  ⚠ Could not delete ${internalName}: ${txt.substring(0, 120)}`);
    }
  }

  // Create a Text field (FieldTypeKind 2)
  async function createTextField(internalName, displayName) {
    const r = await fetch(`${api}/fields`, {
      method: 'POST',
      headers: h,
      credentials: 'include',
      body: JSON.stringify({ Title: displayName, FieldTypeKind: 2, InternalName: internalName, StaticName: internalName })
    });
    if (r.ok) {
      console.log(`  ✓ Created Text field: ${internalName}`);
    } else {
      console.error(`  ✗ Failed to create ${internalName}:`, await r.text());
    }
    // Add to default view
    await fetch(`${api}/views/getbytitle('All Items')/viewfields/addviewfield('${internalName}')`, {
      method: 'POST', headers: h, credentials: 'include'
    });
  }

  console.log('\n── Fixing ProcessSteps columns ─────────────────');

  // 1. Delete old conflicting columns
  console.log('\nDeleting old columns...');
  await deleteField('Owner');
  await deleteField('ManualOrAutomated');
  await deleteField('Frequency');

  // 2. Recreate with safe names as proper Text fields
  console.log('\nCreating replacement columns...');
  await createTextField('StepOwner',       'StepOwner');
  await createTextField('AutomationLevel', 'AutomationLevel');
  await createTextField('StepFrequency',   'StepFrequency');

  console.log('\n══════════════════════════════════════════════════');
  console.log('✓ Done. Verify at:');
  console.log(`  ${siteUrl}/Lists/ProcessSteps`);
  console.log('══════════════════════════════════════════════════');
})();
