import { Navigate } from 'react-router-dom';
import { useSession } from '@seats/frontend-shared';
import { landingOf } from '../../app/landing';
import { usePageTitle } from '../../app/use-page-title';
import { SignInForm } from './SignInForm';

/** The sign-in screen: the centered card; an account that is signed in already goes to its landing screen. */
export default function SignInPage() {
  usePageTitle('Sign in');
  const session = useSession();
  if (session) return <Navigate to={landingOf(session.role)} replace />;
  return (
    <div className="signin-page">
      <SignInForm />
      <div className="tiny demo-accounts">Demo accounts: manager, door1 (front staff) and owner; the password is the username.</div>
    </div>
  );
}
