import { translate } from './i18n';

export function App() {
  return (
    <main>
      <h1>{translate('ja', 'app.title')}</h1>
    </main>
  );
}
