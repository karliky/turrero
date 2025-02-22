'use client';

import { useEffect, useState } from 'react';

export default function ClientClassWrapper({ children }: { children: React.ReactNode }) {
  const [className, setClassName] = useState("__variable_4d318d __variable_ea5f4b antialiased bg-whiskey-50");

  useEffect(() => {
    // Aquí puedes añadir cualquier clase adicional que necesites en el cliente
    setClassName(prev => `${prev} vsc-initialized`);
  }, []);

  return (
    <div className={className}>
      {children}
    </div>
  );
} 