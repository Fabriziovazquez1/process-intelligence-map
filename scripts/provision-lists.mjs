/**
 * provision-lists.mjs
 *
 * One-time setup script — creates ProcessMaps and ProcessSteps lists
 * on your SharePoint site with all required columns.
 *
 * Prerequisites:
 *   node scripts/provision-lists.mjs
 *
 * What happens:
 *   1. Script prints a short code + URL
 *   2. You open https://aka.ms/devicelogin in any browser
 *   3. Enter the code and sign in with your Aptiv credentials
 *   4. Script creates both lists automatically
 *
 * Note: First time running this, your IT admin may need to approve the
 * "PnP Management Shell" app once at:
 * https://login.microsoftonline.com/common/adminconsent?client_id=31359c7f-bd7e-475c-86db-fdb8c937548e
 * (Ask IT if you get an "approval required" error)
 */

import { PublicClientApplication } from '@azure/msal-node';

// ─── Config ────────────────────────────────────────────────────────────────
const SITE_URL   = 'https://spo.aptiv.com/sites/0906-SCMEDSSharepoint';
const API        = `${SITE_URL}/_api/web`;

// PnP Management Shell — standard public client for SPFx dev tooling
const CLIENT_ID  = '31359c7f-bd7e-475c-86db-fdb8c937548e';
const AUTHORITY  = 'https://login.microsoftonline.com/common';
const SCOPES     = ['https://spo.aptiv.com/AllSites.Manage'];

// ─── Auth ──────────────────────────────────────────────────────────────────
async function authenticate() {
  const { exec } = await import('child_process');

  const pca = new PublicClientApplication({
    auth: {
      clientId: CLIENT_ID,
      authority: AUTHORITY
    }
  });

  console.log('Opening browser for sign-in...\n');

  const result = await pca.acquireTokenInteractive({
    scopes: SCOPES,
    openBrowser: async (url) => {
      exec(`open "${url}"`);
    },
    successTemplate: '<html><body style="font-family:sans-serif;padding:40px"><h2>✓ Signed in successfully</h2><p>You can close this window and return to the terminal.</p></body></html>',
    errorTemplate:   '<html><body style="font-family:sans-serif;padding:40px"><h2>✗ Sign-in failed</h2><p>Please close this window and check the terminal for details.</p></body></html>'
  });

  return result.accessToken;
}

// ─── REST helpers ──────────────────────────────────────────────────────────
let _token;
let _digest;

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${_token}`,
    Accept: 'application/json;odata=nometadata',
    'Content-Type': 'application/json;odata=nometadata',
    'X-RequestDigest': _digest,
    ...extra
  };
}

async function getDigest() {
  const res = await fetch(`${SITE_URL}/_api/contextinfo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${_token}`,
      Accept: 'application/json;odata=nometadata',
      'Content-Length': '0'
    }
  });
  const data = await res.json();
  return data.FormDigestValue;
}

async function get(url) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

// ─── List helpers ──────────────────────────────────────────────────────────
async function listExists(title) {
  try {
    await get(`${API}/lists/getbytitle('${encodeURIComponent(title)}')`);
    return true;
  } catch {
    return false;
  }
}

async function createList(title, description) {
  await post(`${API}/lists`, {
    Title: title,
    Description: description,
    BaseTemplate: 100,    // Generic list
    AllowContentTypes: false,
    ContentTypesEnabled: false
  });
  console.log(`  ✓ Created list: ${title}`);
}

async function fieldExists(listTitle, internalName) {
  try {
    const res = await get(
      `${API}/lists/getbytitle('${encodeURIComponent(listTitle)}')/fields?$filter=InternalName eq '${internalName}'`
    );
    return res.value.length > 0;
  } catch {
    return false;
  }
}

// SP field type codes: 1=Text, 2=Note(multiline), 3=DateTime, 4=Counter,
// 8=Boolean, 9=Number, 20=User
async function addField(listTitle, internalName, displayName, typeKind, extra = {}) {
  if (await fieldExists(listTitle, internalName)) {
    console.log(`  ↳ Already exists: ${internalName}`);
    return;
  }
  await post(
    `${API}/lists/getbytitle('${encodeURIComponent(listTitle)}')/fields`,
    { Title: displayName, FieldTypeKind: typeKind, InternalName: internalName, ...extra }
  );
  console.log(`  ✓ Added column: ${internalName} (type ${typeKind})`);
}

// ─── Provision ProcessMaps ──────────────────────────────────────────────────
async function provisionProcessMaps() {
  console.log('\n── ProcessMaps ────────────────────────────────');
  if (!(await listExists('ProcessMaps'))) {
    await createList('ProcessMaps', 'Top-level process maps (e.g. Source-to-Pay)');
  } else {
    console.log('  ↳ List already exists: ProcessMaps');
  }
  // Title = process name (already exists on every list)
  await addField('ProcessMaps', 'Description',   'Description', 2); // Note
  await addField('ProcessMaps', 'IsActive',       'IsActive',    8); // Boolean
}

// ─── Provision ProcessSteps ─────────────────────────────────────────────────
async function provisionProcessSteps() {
  console.log('\n── ProcessSteps ───────────────────────────────');
  if (!(await listExists('ProcessSteps'))) {
    await createList('ProcessSteps', 'Individual steps within each process map');
  } else {
    console.log('  ↳ List already exists: ProcessSteps');
  }
  // Title = step name (already exists)
  await addField('ProcessSteps', 'ProcessMapId',       'ProcessMapId',       9); // Number → FK to ProcessMaps
  await addField('ProcessSteps', 'SubprocessParentId', 'SubprocessParentId', 9); // Number → FK to parent step
  await addField('ProcessSteps', 'Owner',              'Owner',              1); // Text
  await addField('ProcessSteps', 'OwnerEmail',         'OwnerEmail',         1);
  await addField('ProcessSteps', 'ManualOrAutomated',  'ManualOrAutomated',  1);
  await addField('ProcessSteps', 'SortOrder',          'SortOrder',          9); // Number
  await addField('ProcessSteps', 'StepDescription',    'StepDescription',    2); // Note
  await addField('ProcessSteps', 'DataCollected',      'DataCollected',      1);
  await addField('ProcessSteps', 'DataSource',         'DataSource',         1);
  await addField('ProcessSteps', 'Transformation',     'Transformation',     1);
  await addField('ProcessSteps', 'Output',             'Output',             1);
  await addField('ProcessSteps', 'NextPerson',         'NextPerson',         1);
  await addField('ProcessSteps', 'Frequency',          'Frequency',          1);
  await addField('ProcessSteps', 'TimeSpent',          'TimeSpent',          1);
  await addField('ProcessSteps', 'SystemsTouched',     'SystemsTouched',     2); // Note
  await addField('ProcessSteps', 'PainPoints',         'PainPoints',         2); // Note
}

// ─── Main ───────────────────────────────────────────────────────────────────
console.log('Process Intelligence Map — List Provisioning');
console.log(`Site: ${SITE_URL}`);

_token = await authenticate();
console.log('✓ Signed in successfully\n');

_digest = await getDigest();

await provisionProcessMaps();
await provisionProcessSteps();

console.log('\n══════════════════════════════════════════════');
console.log('✓ Done. Both lists are ready.');
console.log(`  ${SITE_URL}/Lists/ProcessMaps`);
console.log(`  ${SITE_URL}/Lists/ProcessSteps`);
console.log('══════════════════════════════════════════════\n');
