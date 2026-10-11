import { Button, Screen, T } from '@/components/ui';
import { useSession, useUser } from '@/session';

export default function Home() {
  const user = useUser();
  const { signOut } = useSession();
  return (
    <Screen>
      <T v="title">Hi {user.name}</T>
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
