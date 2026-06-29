import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { RandomMediaComponent } from './random.component';
import { environment } from '../../../environments/environment';

const FAKE_MEDIA = {
  type: 'image' as const,
  url: 'https://backend/api/media/serve?t=TOKEN123',
  name: 'test-image.jpeg',
};

function setup() {
  TestBed.configureTestingModule({
    imports: [RandomMediaComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(RandomMediaComponent);
  const component = fixture.componentInstance;
  const http = TestBed.inject(HttpTestingController);
  return { fixture, component, http };
}

// Flush la requête API initiale (loadNext)
function flushInitialRequest(
  http: HttpTestingController,
  media = FAKE_MEDIA
) {
  const req = http.expectOne((r) =>
    r.url.startsWith(`${environment.apiUrl}/api/media/random`)
  );
  req.flush(media);
}

describe('RandomMediaComponent — séquence & retry', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  // --- 1. Chargement initial ---

  it('fait exactement 1 appel API au chargement', fakeAsync(() => {
    const { fixture, http } = setup();
    fixture.detectChanges();
    flushInitialRequest(http);
    tick();
    http.verify(); // échoue s'il y a d'autres appels
  }));

  it('affiche le bon média retourné par l\'API', fakeAsync(() => {
    const { fixture, component, http } = setup();
    fixture.detectChanges();
    flushInitialRequest(http);
    tick();
    expect(component.media()?.url).toBe(FAKE_MEDIA.url);
    expect(component.media()?.type).toBe('image');
  }));

  // --- 2. onMediaError() ne recharge PAS depuis l'API ---

  it('onMediaError() ne fait AUCUN appel API supplémentaire', fakeAsync(() => {
    const { fixture, component, http } = setup();
    fixture.detectChanges();
    flushInitialRequest(http);
    tick();

    component.onMediaError(); // première erreur proxy
    tick(500);
    component.onMediaError(); // deuxième erreur proxy
    tick(500);

    // Aucune nouvelle requête HTTP — le compteur n'a pas bougé
    http.expectNone((r) =>
      r.url.startsWith(`${environment.apiUrl}/api/media/random`)
    );
  }));

  it('onMediaError() conserve le même URL de base après retry', fakeAsync(() => {
    const { fixture, component, http } = setup();
    fixture.detectChanges();
    flushInitialRequest(http);
    tick();

    const originalUrl = component.media()!.url;
    component.onMediaError();
    tick(500); // après le délai, le src est remis

    expect(component.media()?.url).toBe(originalUrl);
  }));

  // --- 3. Limite de retry — pas de boucle infinie ---

  it('après MAX_RETRIES erreurs média, passe en état d\'erreur (pas de boucle)', fakeAsync(() => {
    const { fixture, component, http } = setup();
    fixture.detectChanges();
    flushInitialRequest(http);
    tick();

    // Simule 3 erreurs consécutives (MAX_RETRIES = 2, donc 3e appel → erreur)
    component.onMediaError(); tick(500);
    component.onMediaError(); tick(500);
    component.onMediaError(); tick(500); // dépasse la limite

    expect(component.error()).not.toBeNull();
    expect(component.loading()).toBe(false);
    expect(component.media()).not.toBeNull(); // le média précédent est conservé en mémoire

    // Toujours aucun appel API supplémentaire
    http.expectNone((r) =>
      r.url.startsWith(`${environment.apiUrl}/api/media/random`)
    );
  }));

  it('loadNext() est la SEULE fonction qui appelle l\'API', fakeAsync(() => {
    const { fixture, component, http } = setup();
    fixture.detectChanges();
    flushInitialRequest(http); // 1er appel (ngOnInit)
    tick();

    // Un deuxième loadNext = une deuxième requête API (= 1 incrément compteur)
    component.loadNext();
    const req2 = http.expectOne((r) =>
      r.url.startsWith(`${environment.apiUrl}/api/media/random`)
    );
    req2.flush({ ...FAKE_MEDIA, url: 'https://backend/api/media/serve?t=TOKEN456' });
    tick();

    expect(component.media()?.url).toBe('https://backend/api/media/serve?t=TOKEN456');
  }));

  // --- 4. Erreur API → retry API (pas d'appel au compteur côté serveur) ---

  it('erreur API : retry avec un nouvel appel mais sans dépasser MAX_API_RETRIES', fakeAsync(() => {
    const { fixture, component, http } = setup();
    fixture.detectChanges();

    // Première requête échoue
    const req1 = http.expectOne((r) =>
      r.url.startsWith(`${environment.apiUrl}/api/media/random`)
    );
    req1.error(new ProgressEvent('error'));
    tick(800); // délai de retry

    // Deuxième requête (retry automatique)
    const req2 = http.expectOne((r) =>
      r.url.startsWith(`${environment.apiUrl}/api/media/random`)
    );
    req2.flush(FAKE_MEDIA);
    tick();

    expect(component.media()?.url).toBe(FAKE_MEDIA.url);
    expect(component.error()).toBeNull();
  }));
});
