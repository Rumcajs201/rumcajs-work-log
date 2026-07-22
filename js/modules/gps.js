export function getCurrentPosition(options = {}) {
  if (!('geolocation' in navigator)) {
    return Promise.reject(new Error('GPS nie jest dostępny na tym urządzeniu.'));
  }

  const config = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000,
    ...options
  };

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: Date.now()
      }),
      error => {
        const messages = {
          1: 'Brak zgody na dostęp do lokalizacji.',
          2: 'Nie udało się ustalić lokalizacji.',
          3: 'Przekroczono czas oczekiwania na GPS.'
        };
        reject(new Error(messages[error.code] || 'Błąd GPS.'));
      },
      config
    );
  });
}

export function formatPosition(position) {
  if (!position) return '—';
  const accuracy = Number.isFinite(position.accuracy) ? ` ±${Math.round(position.accuracy)} m` : '';
  return `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}${accuracy}`;
}
