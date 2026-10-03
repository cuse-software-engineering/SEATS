import { usePageTitle } from '../../app/use-page-title';
import { CheckInScanner } from './CheckInScanner';

export default function CheckInPage() {
  usePageTitle('Check-in');
  return <CheckInScanner />;
}
