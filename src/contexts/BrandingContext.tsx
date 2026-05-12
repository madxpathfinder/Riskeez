import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BrandingContextType {
  appName: string;
  setAppName: (name: string) => void;
}

const BrandingContext = createContext<BrandingContextType>({ appName: 'AsanRisk', setAppName: () => {} });

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [appName, setAppName] = useState<string>(() => {
    return localStorage.getItem('grc_app_name') || 'AsanRisk';
  });

  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then(data => {
        if (data.appName) {
          setAppName(data.appName);
          localStorage.setItem('grc_app_name', data.appName);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BrandingContext.Provider value={{ appName, setAppName }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
