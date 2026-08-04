'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import AiTutorContent from './components/AiTutorContent';

export default function AiTutorPage() {
  return (
    <AppLayout activePath="/ai-tutor">
      <AiTutorContent />
    </AppLayout>
  );
}
