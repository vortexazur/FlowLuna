import { Track, Playlist } from '../types';

// Aucun morceau par défaut - La bibliothèque démarre vide et propre pour l'utilisateur
export const INITIAL_TRACKS: Track[] = [];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-favorites',
    title: 'Favoris',
    description: 'Morceaux ajoutés à vos coups de cœur',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    icon: 'heart',
    iconColor: 'rose',
    trackIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isSmart: true,
    smartType: 'favorites',
  },
];
