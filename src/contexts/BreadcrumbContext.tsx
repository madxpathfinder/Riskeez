import React, { createContext, useContext, useState, useCallback } from 'react';

interface BreadcrumbContextValue {
  subLabel: string;
  setSubLabel: (label: string) => void;
  clearSubLabel: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  subLabel: '',
  setSubLabel: () => {},
  clearSubLabel: () => {},
});

export const BreadcrumbProvider = ({ children }: { children: React.ReactNode }) => {
  const [subLabel, setSubLabelState] = useState('');

  const setSubLabel = useCallback((label: string) => {
    setSubLabelState(label);
  }, []);

  const clearSubLabel = useCallback(() => {
    setSubLabelState('');
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ subLabel, setSubLabel, clearSubLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumb = () => useContext(BreadcrumbContext);
