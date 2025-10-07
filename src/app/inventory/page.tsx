import InventoryList from '@/components/InventoryList';
import AuthGuardWrapper from '@/components/Auth/AuthGuardWrapper';

export default function InventoryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthGuardWrapper />
      <main className="flex-grow container mx-auto p-4">
        <InventoryList />
      </main>
    </div>
  );
}
