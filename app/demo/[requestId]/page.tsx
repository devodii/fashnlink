import { Suspense } from 'react';
import { DemoProcessing } from './demo-processing';

export default function DemoProcessingPage() {
  return (
    <Suspense>
      <DemoProcessing />
    </Suspense>
  );
}
