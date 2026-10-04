# Consignes d'Autonomie et Sécurité du Projet FlowLuna

## 1. Mode d'Action Autonome
- L'agent doit avancer de manière autonome sur toutes les tâches de développement, compilation, tests, git et corrections au sein de l'espace de travail `flowluna`.
- Éviter d'interrompre l'utilisateur pour de simples validations d'étapes intermédiaires ou des actions courantes du projet (édition de fichiers, commandes `npm`, `dotnet`, `git` locales).

## 2. Protection Stricte du Système d'Exploitation (Garde-fou Noyau / OS)
- **Interdiction formelle** de modifier des fichiers situés en dehors du répertoire du projet `flowluna` (notamment `C:\Windows`, `System32`, `Program Files`, le Registre Windows `HKLM`/`HKCU`, ou les variables d'environnement globales de la machine).
- **Validation utilisateur obligatoire** si une opération nécessite exceptionnellement d'interagir avec le noyau, le système Windows global, des privilèges administrateur (UAC), ou des composants matériels.
- Toute commande système globale ou potentiellement destructive doit être explicitement soumise à l'approbation de l'utilisateur.
