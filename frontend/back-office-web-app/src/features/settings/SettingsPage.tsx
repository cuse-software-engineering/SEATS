import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '@seats/frontend-shared';
import { usePageTitle } from '../../app/use-page-title';
import { BusinessParametersForm } from './BusinessParametersForm';
import { StaffAccountsPanel } from './StaffAccountsPanel';

/** Business parameters beside the staff accounts; the sidebar's two items both open this screen and the hash
 *  scrolls to the card. */
export default function SettingsPage() {
  usePageTitle('Business parameters and staff accounts');
  const canEdit = useSession()?.role === 'manager';
  const hash = useLocation().hash;
  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <div className="settings">
      {!canEdit && <div className="notice">You are signed in as the Owner: the settings are shown for reading only.</div>}
      <div className="cols-2">
        <BusinessParametersForm canEdit={canEdit} />
        <StaffAccountsPanel canEdit={canEdit} />
      </div>
    </div>
  );
}
