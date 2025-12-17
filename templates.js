// Document templates and renderers
export const templates = {
  listKinds(){
    return [
      'Befund (kurz)',
      'Verlaufsnotiz',
      'Vereinbarung/Entbindung',
      'Übergabebericht',
      'Ebene 2: Vertrauliche Inhalte (nur psychologisch)',
      'Ebene 3: Resonanz / Arbeitshypothesen (nur für mich)',
      'Angst & Zwang – Fokus (Patientmanagement/Schnittstellen/Selbstmanagement)',
      'Checkliste Vernetzung (Akutpsychiatrie)',
      'Team-Besprechung: Agenda & Ergebnis',
    ];
  },
  describe(kind){
    const map = {
      'Befund (kurz)': 'Strukturdaten + klinisch-psychologischer Befund in klaren Feldern.',
      'Verlaufsnotiz': 'Kurz und schnell: Thema, Intervention, Verlauf, nächste Schritte.',
      'Vereinbarung/Entbindung': 'Welche Infos dürfen wohin? (Team/Vernetzung) + Dokumentation.',
      'Übergabebericht': 'Deskriptiv, zielorientiert, für Transfer (ambulant/stationär).',
      'Ebene 2: Vertrauliche Inhalte (nur psychologisch)': 'Geheimnisse getrennt dokumentieren (nicht für interprofessionellen Dekurs).',
      'Ebene 3: Resonanz / Arbeitshypothesen (nur für mich)': 'Eigene Resonanz, Hypothesen, Reflexion (nicht weitergeben).',
      'Angst & Zwang – Fokus (Patientmanagement/Schnittstellen/Selbstmanagement)': 'Brainstorming-Vorlage für die Übung (Angst/Zwang).',
      'Checkliste Vernetzung (Akutpsychiatrie)': 'Fragenkatalog: Aufnahmeprozedere, Ethikprüfung, was braucht Patient:in?',
      'Team-Besprechung: Agenda & Ergebnis': 'Effiziente Besprechung: Agenda, Beschlüsse, Verantwortliche, Doku.'
    };
    return map[kind] || '';
  },
  create(kind){
    const base = { title: kind };
    switch(kind){
      case 'Befund (kurz)':
        return {
          ...base,
          datum: new Date().toISOString().slice(0,10),
          setting: 'ambulant / stationär',
          anlass: '',
          diagnostik: { verfahren: '', ergebnisse: '' },
          symptome: '',
          ressourcen: '',
          ziele: '',
          interventionen: '',
          vereinbarungen: '',
          empfehlungen: '',
          ebene2_hinweis: 'Vertrauliche Inhalte NICHT hier (siehe Ebene-2-Dokument).',
          ebene3_hinweis: 'Eigene Resonanz NICHT hier (siehe Ebene-3-Dokument).'
        };
      case 'Verlaufsnotiz':
        return {
          ...base,
          datum: new Date().toISOString().slice(0,10),
          thema: '',
          beobachtung: '',
          intervention: '',
          reaktion: '',
          naechste_schritte: '',
          risiko: 'keine / Hinweis / akut (dann eigenes Vorgehen dokumentieren)'
        };
      case 'Vereinbarung/Entbindung':
        return {
          ...base,
          datum: new Date().toISOString().slice(0,10),
          zweck: 'Team / Vernetzung / Bericht',
          was_darf_weiter: 'nur deskriptiv (Symptomebene) / konkrete Punkte',
          an_wen: '',
          grenzen: 'keine Details zu Geheimnissen / Inhaltebene nur wenn notwendig und vereinbart',
          dokumente: 'Unterschrift eingescannt als Anhang hinzufügen',
          notizen: ''
        };
      case 'Übergabebericht':
        return {
          ...base,
          datum: new Date().toISOString().slice(0,10),
          empfaenger: '',
          kurzbeschreibung: '',
          diagnose_deskriptiv: '',
          relevante_symptome: '',
          ausloeser_kontext: '',
          bisherige_massnahmen: '',
          wirksam: '',
          nicht_wirksam: '',
          risiko_schutz: '',
          empfehlung_transfer: '',
          was_nicht_enthalten: 'Keine Inhaltebene / Geheimnisse; nur Relevantes für Gesamtbehandlung.'
        };
      case 'Ebene 2: Vertrauliche Inhalte (nur psychologisch)':
        return {
          ...base,
          datum: new Date().toISOString().slice(0,10),
          vertraulich: 'JA – nicht in interprofessionellen Dekurs übernehmen',
          inhalte: '',
          warum_geheimnis: '',
          was_team_trotzdem_wissen_muss: 'Symptomebene / Schutzfaktoren / Trigger ohne Details',
          vereinbarung: 'Wurde mit Patient:in besprochen: ja/nein'
        };
      case 'Ebene 3: Resonanz / Arbeitshypothesen (nur für mich)':
        return {
          ...base,
          datum: new Date().toISOString().slice(0,10),
          resonanz: '',
          arbeitshypothesen: '',
          eigene_grenzen_marker: '',
          naechster_schritt_fuer_mich: '',
          intervision_supervision: 'geplant / nötig / erledigt'
        };
      case 'Angst & Zwang – Fokus (Patientmanagement/Schnittstellen/Selbstmanagement)':
        return {
          ...base,
          stoerungsbild: 'Angst / Zwang',
          patientmanagement: {
            struktur: 'Regelmäßigkeit, klare Rahmen, kurze Infos, schriftliche Mini-Schritte',
            sicherheit: 'Panik/Entgleisung: Plan, Notfallnummern, klare Verantwortungen',
            dokumentation: 'deskriptiv + Ziele; Geheimnisse getrennt; Risiko sauber dokumentieren'
          },
          schnittstellen: {
            arzt_facharzt: 'früh Kontakt (z.B. bei starker Anspannung/Komorbidität); Medikationsinfos deskriptiv',
            team_pflege: 'was müssen sie wissen (Trigger/Alarmzeichen) ohne Inhaltebene',
            vernetzung: 'Akutpsychiatrie, Hausarzt, Psychiater, Reha, Notfallplan'
          },
          selbstmanagement: {
            marker: 'z.B. eigene Anspannung bei Expositionen, „Retter“-Impuls, Überverantwortung',
            grenzen: 'keine spontane Zusage/Übernahme; klare Erreichbarkeit',
            intervision: 'bei schwierigen Expositionen / Suizidabklärung / Eskalation'
          },
          konkrete_beispiele: ''
        };
      case 'Checkliste Vernetzung (Akutpsychiatrie)':
        return {
          ...base,
          klinik: '',
          kontakt: '',
          fragen: {
            aufnahme: 'Wie läuft Aufnahme ab? (Ablauf, Wartezeit, wer spricht wann?)',
            was_mitnehmen: 'Was mitnehmen? (Dokumente, Kleidung, Medikamente, …)',
            freiwillig_vs_unfreiwillig: 'Wie wird entschieden? Wer informiert? Rechte?',
            ethik_pruefung: 'Wann findet Überprüfung statt, ob Unterbringung noch notwendig ist?',
            tag2: 'Was erleben Patient:innen am 2. Tag? (Visite, Gespräch, Tagesstruktur)',
            kommunikation: 'Wie kann Praxis Infos geben? Was wird zurückgemeldet?'
          },
          notizen: ''
        };
      case 'Team-Besprechung: Agenda & Ergebnis':
        return {
          ...base,
          datum: new Date().toISOString().slice(0,10),
          teilnehmende: '',
          agenda: '1) …\n2) …\n3) …',
          fall_besprochen: 'anonym / mit Einwilligung',
          beschluesse: '',
          wer_macht_was: '',
          dokumentation: 'Was kommt in interprofessionellen Dekurs (kurz & deskriptiv)?',
          risiken: ''
        };
      default:
        return { ...base, text: '' };
    }
  },
  render(kind, ctx){
    const { ui, field, has } = ctx;
    const t = (name, placeholder='') => ui.h('textarea', { name, placeholder }, [has(name, '')]);
    const i = (name, placeholder='') => ui.h('input', { name, placeholder, value: has(name, '') });
    const s = (name, options=[]) => ui.h('select', { name }, options.map(o => ui.h('option', { value:o, selected: has(name,'')===o }, [o])));

    switch(kind){
      case 'Befund (kurz)':
        return [
          ui.h('div', { class:'split' }, [
            ui.h('div', {}, [
              field('Datum', i('datum','YYYY-MM-DD')),
              field('Setting', i('setting','ambulant / stationär')),
              field('Anlass', t('anlass','Warum kommt die Person?')),
              field('Symptome (deskriptiv)', t('symptome','Symptomebene, keine Inhaltebene.')),
            ]),
            ui.h('div', {}, [
              field('Ressourcen', t('ressourcen','Stärken, Schutzfaktoren')),
              field('Ziele', t('ziele','Zielorientiert, überprüfbar')),
              field('Interventionen', t('interventionen','Was wurde gemacht?')),
              field('Vereinbarungen', t('vereinbarungen','z.B. Weitergabe im Team, Frequenz, Kontaktregeln')),
            ])
          ]),
          field('Diagnostik – Verfahren', t('diagnostik.verfahren','z.B. klinisches Interview, Skalen, Tests')),
          field('Diagnostik – Ergebnisse', t('diagnostik.ergebnisse','Kurz, verständlich, belastbar')),
          field('Empfehlungen', t('empfehlungen','Transfer / weitere Schritte')),
          ui.h('div', { class:'notice' }, [has('ebene2_hinweis','')]),
          ui.h('div', { class:'notice' }, [has('ebene3_hinweis','')]),
        ];
      case 'Verlaufsnotiz':
        return [
          field('Datum', i('datum','YYYY-MM-DD')),
          field('Thema', t('thema','Worum ging es?')),
          field('Beobachtung', t('beobachtung','Kurz & deskriptiv')),
          field('Intervention', t('intervention','Welche Intervention?')),
          field('Reaktion/Verlauf', t('reaktion','Wie reagierte die Person?')),
          field('Nächste Schritte', t('naechste_schritte','Konkrete nächste Schritte')),
          field('Risiko', i('risiko','keine / Hinweis / akut')),
        ];
      case 'Vereinbarung/Entbindung':
        return [
          field('Datum', i('datum','YYYY-MM-DD')),
          field('Zweck', i('zweck','Team / Vernetzung / Bericht')),
          field('An wen?', t('an_wen','z.B. Hausarzt, Station, Teamrolle')),
          field('Was darf weitergegeben werden?', t('was_darf_weiter','Symptomebene + konkret vereinbarte Punkte')),
          field('Grenzen', t('grenzen','Was NICHT? (Geheimnisse/Details)')),
          field('Dokumente', t('dokumente','Unterschrift als Anhang hinzufügen')),
          field('Notizen', t('notizen','')),
        ];
      case 'Übergabebericht':
        return [
          field('Datum', i('datum','YYYY-MM-DD')),
          field('Empfänger', i('empfaenger','')),
          field('Kurzbeschreibung', t('kurzbeschreibung','')),
          field('Diagnose/Problem (deskriptiv)', t('diagnose_deskriptiv','z.B. Angststörung, Zwangssymptomatik…')),
          field('Relevante Symptome', t('relevante_symptome','')),
          field('Kontext/Trigger (ohne Details)', t('ausloeser_kontext','')),
          ui.h('div', { class:'split' }, [
            ui.h('div', {}, [
              field('Bisherige Maßnahmen', t('bisherige_massnahmen','')),
              field('Wirksam', t('wirksam','')),
            ]),
            ui.h('div', {}, [
              field('Nicht wirksam', t('nicht_wirksam','')),
              field('Risiko & Schutz', t('risiko_schutz','')),
            ])
          ]),
          field('Empfehlung für Transfer', t('empfehlung_transfer','')),
          ui.h('div', { class:'notice' }, [has('was_nicht_enthalten','')]),
        ];
      case 'Ebene 2: Vertrauliche Inhalte (nur psychologisch)':
        return [
          field('Datum', i('datum','YYYY-MM-DD')),
          field('Vertraulich', i('vertraulich','JA')),
          field('Inhalte (geschützt)', t('inhalte','Hier ist Platz für Inhaltebene – bewusst getrennt.')),
          field('Warum ist es ein Geheimnis?', t('warum_geheimnis','Natürliches Interesse/Schutz des Vertrauens')),
          field('Was muss das Team trotzdem wissen (deskriptiv)?', t('was_team_trotzdem_wissen_muss','Trigger/Alarmzeichen/Umgang, ohne Details.')),
          field('Vereinbarung besprochen?', i('vereinbarung','ja/nein')),
        ];
      case 'Ebene 3: Resonanz / Arbeitshypothesen (nur für mich)':
        return [
          field('Datum', i('datum','YYYY-MM-DD')),
          field('Resonanz (bei mir)', t('resonanz','Was löst der Fall in mir aus?')),
          field('Arbeitshypothesen', t('arbeitshypothesen','Hypothesen, die ich prüfen will')),
          field('Eigene Grenzen/Marker', t('eigene_grenzen_marker','Woran merke ich, dass ich kippe?')),
          field('Nächster Schritt für mich', t('naechster_schritt_fuer_mich','z.B. Pause, Intervision, Supervision')),
          field('Intervision/Supervision', i('intervision_supervision','geplant / nötig / erledigt')),
        ];
      case 'Angst & Zwang – Fokus (Patientmanagement/Schnittstellen/Selbstmanagement)':
        return [
          field('Störungsbild', i('stoerungsbild','Angst / Zwang')),
          ui.h('div', { class:'split' }, [
            ui.h('div', {}, [
              ui.h('h3', { style:'margin:6px 0 10px 0' }, ['Patientmanagement']),
              field('Struktur', t('patientmanagement.struktur','')),
              field('Sicherheit', t('patientmanagement.sicherheit','')),
              field('Dokumentation', t('patientmanagement.dokumentation','')),
            ]),
            ui.h('div', {}, [
              ui.h('h3', { style:'margin:6px 0 10px 0' }, ['Schnittstellenmanagement']),
              field('Arzt/Facharzt', t('schnittstellen.arzt_facharzt','')),
              field('Team/Pflege', t('schnittstellen.team_pflege','')),
              field('Vernetzung', t('schnittstellen.vernetzung','')),
            ])
          ]),
          ui.h('h3', { style:'margin:10px 0' }, ['Selbstmanagement']),
          field('Marker', t('selbstmanagement.marker','')),
          field('Grenzen', t('selbstmanagement.grenzen','')),
          field('Intervision', t('selbstmanagement.intervision','')),
          field('Konkrete Beispiele', t('konkrete_beispiele','z.B. Exposition schrittweise: 15:21 → 15:17, etc.')),
        ];
      case 'Checkliste Vernetzung (Akutpsychiatrie)':
        return [
          field('Klinik/Station', i('klinik','')),
          field('Kontakt', i('kontakt','Name/Telefon/E-Mail')),
          field('Aufnahme', t('fragen.aufnahme','')),
          field('Was mitnehmen', t('fragen.was_mitnehmen','')),
          field('Freiwillig vs. unfreiwillig', t('fragen.freiwillig_vs_unfreiwillig','')),
          field('Ethische Überprüfung', t('fragen.ethik_pruefung','')),
          field('Tag 2', t('fragen.tag2','')),
          field('Kommunikation', t('fragen.kommunikation','')),
          field('Notizen', t('notizen','')),
        ];
      case 'Team-Besprechung: Agenda & Ergebnis':
        return [
          field('Datum', i('datum','YYYY-MM-DD')),
          field('Teilnehmende', t('teilnehmende','Rollen/Name')),
          field('Agenda', t('agenda','')),
          field('Fall besprochen', i('fall_besprochen','anonym / mit Einwilligung')),
          field('Beschlüsse', t('beschluesse','')),
          field('Wer macht was', t('wer_macht_was','')),
          field('Dokumentation', t('dokumentation','Kurz & deskriptiv in interprofessionellen Dekurs')),
          field('Risiken', t('risiken','')),
        ];
      default:
        return [field('Text', t('text',''))];
    }
  }
};
