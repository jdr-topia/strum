import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigErrorScreen } from '@/components/ConfigErrorScreen';
import { parseEnv } from '@/config/env';
import './index.css';

const root = createRoot(document.getElementById('root')!);
const envResult = parseEnv(import.meta.env);

if (!envResult.ok) {
  // Missing/invalid config: show a readable screen instead of a blank page.
  root.render(
    <StrictMode>
      <ConfigErrorScreen problems={envResult.problems} />
    </StrictMode>,
  );
} else {
  // Firebase is only initialised once env is known to be valid.
  void Promise.all([import('@/config/firebase'), import('@/App')])
    .then(([, { App }]) => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    })
    .catch((error: unknown) => {
      console.error(error);
      root.render(
        <StrictMode>
          <ConfigErrorScreen
            problems={[error instanceof Error ? error.message : 'Unknown startup error']}
          />
        </StrictMode>,
      );
    });
}
