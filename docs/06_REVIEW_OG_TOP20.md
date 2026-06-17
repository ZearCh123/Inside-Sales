# 06 — Review & Top 20 forbedringer

Et ærligt review af hele dokumentsættet + en prioriteret liste, du kan bruge direkte med Claude Code — også uden teknisk baggrund. Hvert punkt har en **"Sig til Claude Code"**-sætning, du bare kan kopiere ind.

**Prioritets-nøgle:**
🔴 = kritisk / tag fat tidligt (påvirker demo eller sikkerhed) · 🟠 = før launch 1/8 · 🟢 = forbedring bagefter

---

## Samlet vurdering

**Det stærke (behold det):** Datamodellen er gennemtænkt og dækkende (34 tabeller, konsistent på tværs af dokumenterne). Sikkerheden er solidt tænkt med RLS på alle tabeller og private email/opkald. Køreplanen er rigtigt sekvenseret med Market Intelligence først. Designet er konkret og smukt. Det er et stærkt **fundament**.

**Det der mangler (sandheden):** Dokumenterne beskriver *hvad* der skal bygges, men er lette på **drift, jura og kvalitetssikring** — altså det der gør forskellen mellem "en flot demo" og "et system man tør sætte rigtige kunder og data i". De tre største huller er: (1) et par **tidsbomber i tidsplanen** (især Google-godkendelse og lange AI-jobs), (2) **jura/GDPR** når kunde-emails og opkald sendes til AI, og (3) **ingen test/overvågning/budgetlofter**. Top 20 nedenfor lukker hullerne i prioriteret rækkefølge.

**Kort per dokument:**
- `01_ARCHITECTURE` — godt overblik; mangler driftsdetaljer (job-kø, overvågning, miljøer, backup).
- `02_DATA_MODEL` / `03_SQL` — stærke; små ting: `create policy` kan ikke køres to gange (ingen "if not exists"), og "fit_score" er ikke defineret. Storage-bucket til filer mangler.
- `04_BUILD_ROADMAP` — god rækkefølge; undervurderer Google-godkendelse og filhåndtering (PDF/Word); ingen test-/budget-porte.
- `05_SUBAGENTS` — fint; mangler en agent/ansvar for jura/compliance og for "DevOps" (miljøer, secrets).

---

## TOP 20

### 1. 🔴 Start Google-godkendelsen NU — den kan vælte tidsplanen
**Mangel:** Inbox/Calendar kræver "restricted scopes" hos Google, som kræver en sikkerhedsgodkendelse (CASA) der kan tage **uger** og koste penge. Det er planlagt til fase 5, men ansøgningen skal startes længe før.
**Hvorfor:** Hvis I venter til juli, kan email-modulet ikke gå live til 1/8.
**Sig til Claude Code:** *"Lav en tjekliste til Google Cloud OAuth-opsætning for Gmail + Calendar: hvilke scopes vi bør bruge (mindst muligt), hvordan vi kører på 'test users' under udvikling, og præcis hvad Google-verifikationen kræver. Marker hvad jeg skal ansøge om allerede nu."*

### 2. 🔴 Lange AI-jobs skal køre i en jobkø — ikke i en almindelig webfunktion
**Mangel:** Den månedlige intelligence-scan og den daglige leads-scan kan tage minutter (web-søgning + AI). Vercels almindelige funktioner stopper efter sekunder → jobbet fejler.
**Hvorfor:** Selve demo-funktionen (kør månedlig scan) risikerer at "time out".
**Sig til Claude Code:** *"Indfør en baggrunds-jobkø (fx Inngest eller Trigger.dev, eller Supabase Edge Functions med kø) til alle lange AI-jobs: intel-scan, radar-scan, embeddings og email-sync. Webfunktioner må kun starte jobbet og vise status — aldrig vente på det."*

### 3. 🔴 Få rigtige dokumenter ind i RAG (PDF/Word/Excel + scannede filer)
**Mangel:** Food trials, PI'er og specs er typisk PDF/Word/Excel — ofte med tabeller eller scannede. Køreplanen antager ren tekst.
**Hvorfor:** Uden filhåndtering har Sales Agent ingen rigtig viden at trække på.
**Sig til Claude Code:** *"Tilføj fil-ingestion til RAG: upload af PDF/Word/Excel til en Supabase Storage-bucket (med RLS), udtræk tekst og tabeller, OCR på scannede PDF'er, og kør det gennem chunking + embeddings. Vis status pr. dokument (indekseret/fejlet)."*

### 4. 🔴 GDPR & databehandling — især når kunde-data sendes til AI
**Mangel:** I behandler personoplysninger (kontakter, emails) og sender indhold til OpenAI/Anthropic/Tavily. Der er ingen samtykke-/opbevarings-/sletnings-politik eller databehandleraftaler (DPA).
**Hvorfor:** EU-B2B med kunde-emails uden styr på dette er en reel juridisk risiko — og kunder vil spørge.
**Sig til Claude Code:** *"Lav en GDPR-tjekliste for projektet: hvilke databehandleraftaler (DPA) vi skal have med Google, OpenAI, Anthropic, Tavily, Deepgram og Supabase; en opbevarings- og sletningspolitik pr. tabel; en 'slet bruger/konto'-funktion; og en note om hvilke data vi IKKE bør sende til AI. Tilføj felter/funktioner i appen hvor det kræves."*

### 5. 🔴 Lav et flot demo-datasæt (til 23/6 og til test)
**Mangel:** Ud over juni-rapporten er der ingen realistisk seed-data (konti, projekter i alle 4 faser, et eksempel-opkald, coach-tal).
**Hvorfor:** En tom app demoer dårligt. Realistisk data får både demoen og din egen testning til at skinne.
**Sig til Claude Code:** *"Lav et seed-script med realistisk demo-data: 10–15 konti (distributører + producenter i forskellige territorier som Brenntag-Mellemøsten, Pigment-Polen, Oterra-globalt), projekter fordelt på alle 4 faser + et par won/lost, et par opgaver, et eksempel-opkald med coach-metrics, og 5 RAG-dokumenter. Det skal kunne nulstilles og køres igen."*

### 6. 🔴 Budget-lofter på AI/API'er — undgå en regning-overraskelse
**Mangel:** Tavily, OpenAI, Claude og Deepgram koster pr. brug. Der er ingen lofter, caching eller forbrugsoverblik.
**Hvorfor:** Et løbsk cron-job eller en bug kan brænde mange penge på en nat.
**Sig til Claude Code:** *"Indfør forbrugskontrol: cache embeddings så samme tekst ikke embeddes igen, sæt et dagligt/månedligt loft pr. tjeneste med stop + alarm hvis det rammes, og lav en lille 'API-forbrug'-side så jeg kan se omkostningerne pr. modul."*

### 7. 🟠 Opkalds-optagelse kræver samtykke (jura) før voice-fasen
**Mangel:** Sales Agent optager/transskriberer kundeopkald. Optagelse kræver samtykke, og reglerne varierer pr. land.
**Hvorfor:** At optage uden samtykke er ulovligt mange steder og kan skade kundeforhold.
**Sig til Claude Code:** *"Byg en samtykke-funktion ind i Sales Agent: tydelig 'optagelse i gang'-tilstand, mulighed for at kunden/sælgeren skal acceptere før optagelse, og en indstilling pr. land/territorium. Skriv også en kort note om hvor lyden behandles (datalokation)."*

### 8. 🟠 Cold outreach skal være lovligt og lande i indbakken
**Mangel:** Outreach-motoren beskriver mekanikken, men ikke samtykke/afmelding eller leveringsevne (SPF/DKIM/DMARC), eller afsendelsesgrænser.
**Hvorfor:** Uden dette ryger mails i spam, og I risikerer at bryde markedsføringsregler.
**Sig til Claude Code:** *"Tilføj til outreach: automatisk afmeldings-link og -håndtering, et lovligt grundlag/samtykke-felt pr. kontakt, afsendelsesgrænser pr. dag, og en tjekliste til at sætte SPF/DKIM/DMARC op på vores afsenderdomæne så mails lander i indbakken."*

### 9. 🟠 Automatiske tests + en simpel 'grøn/rød'-port
**Mangel:** Kun `qa-reviewer` nævnes; ingen rigtige tests eller CI.
**Hvorfor:** Som ikke-tekniker har du brug for et tydeligt signal om at noget virker — og at nye ændringer ikke ødelægger det gamle.
**Sig til Claude Code:** *"Sæt automatiske tests op: end-to-end tests (Playwright) for de vigtigste flows pr. modul, plus tests der bekræfter at brugere ikke kan se hinandens data. Kør dem automatisk ved hver push (GitHub Actions) og giv mig en simpel grøn/rød-status."*

### 10. 🟠 Overvågning & alarmer (så du opdager fejl før kunden)
**Mangel:** Ingen fejl-logning eller besked når et cron-job fejler.
**Hvorfor:** Hvis månedsscanningen fejler i stilhed, opdager du det først til næste bestyrelsesmøde.
**Sig til Claude Code:** *"Tilføj fejlovervågning (fx Sentry) til både frontend og baggrundsjobs, og send mig en besked (email/Slack) hvis et cron-job fejler eller en AI-tjeneste er nede."*

### 11. 🟠 Backup & gendannelse — og en øvelse i at gendanne
**Mangel:** Nævnt løst i fase 6, men ikke konkret.
**Hvorfor:** Data er hele værdien. Du skal vide at du kan få det tilbage.
**Sig til Claude Code:** *"Bekræft at Supabase point-in-time backup er slået til, lav en ugentlig eksport af de vigtigste tabeller til vores Storage, og skriv en kort 'sådan gendanner du'-vejledning. Lav én test-gendannelse så vi ved den virker."*

### 12. 🟠 Adskil 'test' fra 'rigtig drift' (to miljøer)
**Mangel:** Ét Supabase/Vercel-miljø. Ingen sikker legeplads.
**Hvorfor:** Du vil ikke teste nye ting oven på rigtige kundedata.
**Sig til Claude Code:** *"Opsæt to miljøer: 'staging' (til test) og 'production' (rigtige data), hver med sin egen Supabase og Vercel. Ændringer testes i staging først. Forklar mig hvordan jeg skifter og hvordan databaseændringer flyttes sikkert (migrationer)."*

### 13. 🟠 Gør designet til genbrugelige byggeklodser
**Mangel:** Designet lever i én HTML-fil. Risiko: hver skærm kommer til at se lidt forskellig ud.
**Hvorfor:** Et konsistent, genbrugeligt design gør appen hurtigere at bygge og mere professionel.
**Sig til Claude Code:** *"Træk designet ud i et fælles designsystem: farver/fonte som tokens i Tailwind-config, og genbrugelige komponenter (knapper, kort, chips, tabeller, KPI-felter) baseret på prototypen. Alle moduler skal bruge dem."*

### 14. 🟠 Mobil-først — sælgere er på farten
**Mangel:** Responsivt nævnes let. Overview og Sales Agent skal være gode på telefon.
**Hvorfor:** En sælger tjekker dagens program og bruger coachen fra mobilen, ikke et skrivebord.
**Sig til Claude Code:** *"Gør Overview, Projects og Sales Agent mobil-først og test dem på en telefon-skærmstørrelse. Sørg for tilgængelighed (kontrast, tastatur, skærmlæser) på de vigtigste sider."*

### 15. 🟠 Login med Google + ordentligt invitations-flow
**Mangel:** Kun magic-link. I bruger Google Workspace.
**Hvorfor:** "Log ind med Google" er hurtigere og mere sikkert, og I skal kunne invitere kolleger med roller.
**Sig til Claude Code:** *"Tilføj 'Log ind med Google' (SSO) oven på magic-link, et invitations-flow hvor en admin inviterer brugere og vælger rolle, og rimelige session-/timeout-regler."*

### 16. 🟠 RAG der ved hvornår den IKKE ved noget
**Mangel:** Ingen "intet svar fundet"-tilstand eller kontrol mod at AI'en finder på noget.
**Hvorfor:** En sælger der får et opfundet pH-tal på et kundeopkald er værre end intet svar.
**Sig til Claude Code:** *"Sørg for at Sales Agent kun svarer ud fra fundne kilder: hvis intet relevant findes, skal den sige det ærligt i stedet for at gætte. Vis altid kilderne, og lav et lille testsæt af spørgsmål+forventede svar så vi kan måle kvaliteten."*

### 17. 🟢 Ledelses-analyser: pipeline-tragt og win-rate
**Mangel:** Sales Coach måler sælgeren, men der mangler et samlet forretnings-overblik (konvertering mellem de 4 faser, win-rate, hastighed, værdi pr. territorium/kundetype).
**Hvorfor:** Det er det ledelsen og du vil vise frem og styre efter.
**Sig til Claude Code:** *"Byg et ledelses-dashboard: konverteringsrate mellem de 4 faser, win/loss-rate og årsager, gennemsnitlig tid pr. fase, og pipeline-værdi opdelt på kundetype (distributør/producent) og territorium."*

### 18. 🟢 Deling & rettigheder skal kunne styres i appen
**Mangel:** Tabellen `record_shares` findes, men der er ingen knap/flow til at dele et projekt eller styre team-synlighed.
**Hvorfor:** Sikkerheden er kun nyttig hvis man let kan dele det rigtige med de rigtige.
**Sig til Claude Code:** *"Lav en enkel del-funktion: en 'del'-knap på konti/projekter (vælg kollega + læse/skrive), og en admin-side hvor man styrer roller og team-synlighed. Alt logges i audit-loggen."*

### 19. 🟢 Notifikationer der faktisk når frem
**Mangel:** `notifications`-tabellen findes, men ingen levering.
**Hvorfor:** Heads-up er kun værdifuldt hvis sælgeren ser det i tide.
**Sig til Claude Code:** *"Lever notifikationer i realtid i appen (klokke-ikon) plus en daglig email-opsummering om morgenen med dagens møder, opgaver og heads-up. Lad brugeren styre hvad de vil have besked om."*

### 20. 🟢 Importér eksisterende data + definér fit-score
**Mangel:** Ingen vej til at få nuværende kunde-/lead-data ind, og "fit_score" er ikke defineret.
**Hvorfor:** I starter næppe fra nul, og en uforklaret score skaber ikke tillid.
**Sig til Claude Code:** *"Lav en import-funktion fra regneark (CSV/Excel) for konti og kontakter, og definér tydeligt hvordan 'fit-score' beregnes (hvilke signaler tæller, og hvordan), så scoren kan forklares for brugeren."*

---

## Hurtige småfikse (tag dem løbende)

- **SQL kan ikke køres to gange:** *"Gør SQL-migrationerne sikre at køre flere gange (drop policy if exists før create, eller brug if not exists), så vi ikke får fejl ved gentagne kørsler."*
- **Token-fornyelse for Google:** *"Sørg for at Google-tokens fornys automatisk, og håndtér pænt hvis en bruger trækker adgang tilbage."*
- **Rate-limiting på offentlige endpoints** for at undgå misbrug.
- **'model + prompt-version' gemmes pr. intel-run** (feltet findes — sørg for det faktisk udfyldes), så rapporter er reproducerbare.

---

## Sådan bruger du listen med Claude Code (ikke-teknisk opskrift)

1. **Byg først efter køreplanen** (`04_BUILD_ROADMAP.md`) fase for fase — lad være med at gøre alt på listen på én gang.
2. **Tag de 🔴 røde tidligt:** punkt 1 (Google) og 2 (jobkø) bør Claude Code tage stilling til allerede i fase 0/1, fordi de påvirker resten. Punkt 5 (demo-data) hjælper 23/6-demoen direkte.
3. **Tag de 🟠 orange undervejs mod 1/8** — gerne som en fast "kvalitets- og sikkerhedsrunde" i slutningen af hver fase.
4. **Gem de 🟢 grønne til efter første demo**, når I ved hvad der bruges mest.
5. **Én ting ad gangen:** kopiér én "Sig til Claude Code"-sætning, lad den arbejde, bed om "forklar hvad du lavede og hvad jeg skal teste", og gå så videre.

> Tommelfingerregel: alt med 🔴 handler om at undgå at noget **vælter** (demo, jura, sikkerhed, penge). Det er dem en ikke-teknisk grundlægger oftest overser — og dem der gør størst forskel.
