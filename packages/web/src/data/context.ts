import { createContext, useContext } from 'react';
import { createCachedDataSource, createStaticDataSource, type DataSource } from './data-source';

const defaultSource = createCachedDataSource(
  createStaticDataSource(`${import.meta.env.BASE_URL}data/`),
);

export const DataSourceContext = createContext<DataSource>(defaultSource);

export function useDataSource(): DataSource {
  return useContext(DataSourceContext);
}
