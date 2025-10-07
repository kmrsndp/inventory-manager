import AddSaleForm from '@/components/AddSaleForm';
import { Toaster } from 'react-hot-toast';
import AuthGuardWrapper from '@/components/Auth/AuthGuardWrapper';

export default function AddSalePage() {
  return (
    <>
      <AuthGuardWrapper />
      <AddSaleForm />
      <Toaster />
    </>
  );
}
