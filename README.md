# Git Workflow för signalk-performance-calculator

## Brancher

- **main**  
  Stabil och release-färdig kod. Endast merge från `dev` hit efter test och verifiering.

- **dev**  
  Aktiv utvecklingsbranch där nya funktioner och fixar sker. Kan vara instabil.

## Arbetsflöde

1. Utveckla i `dev`  
   - Commit:a och pusha ofta.  
   - Testa lokalt att allt fungerar.

2. När `dev` är stabil och redo för release:  
   - Byt till `main`: `git checkout main`  
   - Hämta senaste: `git pull origin main`  
   - Merg:a in `dev`: `git merge dev`  
   - Pusha `main`: `git push origin main`

3. (Valfritt) Tagga releasen i `main`:  
   - `git tag -a v1.0.0 -m "Release v1.0.0"`  
   - `git push origin v1.0.0`

4. Håll `dev` uppdaterad från `main` vid behov:  
   - `git checkout dev`  
   - `git pull origin dev`  
   - `git merge main`  
   - `git push origin dev`

---


