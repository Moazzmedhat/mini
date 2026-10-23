import { PlayerState, CombatEvent, ScoreboardEntry, WeaponType, WEAPONS } from '@jetpack-arena/shared';

export class HUD {
  private healthFill: HTMLElement;
  private healthValue: HTMLElement;
  private fuelFill: HTMLElement;
  private fuelValue: HTMLElement;
  private weaponName: HTMLElement;
  private ammoValue: HTMLElement;
  private reloadPrompt: HTMLElement;
  private killFeed: HTMLElement;
  private countdownOverlay: HTMLElement;
  private countdownNumber: HTMLElement;
  private matchEndOverlay: HTMLElement;
  private winnerText: HTMLElement;
  private scoreboardBody: HTMLElement;
  private timerDisplay: HTMLElement;

  constructor() {
    this.healthFill = document.getElementById('hud-health-fill')!;
    this.healthValue = document.getElementById('hud-health-value')!;
    this.fuelFill = document.getElementById('hud-fuel-fill')!;
    this.fuelValue = document.getElementById('hud-fuel-value')!;
    this.weaponName = document.getElementById('hud-weapon-name')!;
    this.ammoValue = document.getElementById('hud-ammo-value')!;
    this.reloadPrompt = document.getElementById('hud-reload-indicator')!;
    this.killFeed = document.getElementById('kill-feed-container')!;
    this.countdownOverlay = document.getElementById('countdown-overlay')!;
    this.countdownNumber = document.getElementById('countdown-number')!;
    this.matchEndOverlay = document.getElementById('match-end-overlay')!;
    this.winnerText = document.getElementById('match-winner-text')!;
    this.scoreboardBody = document.getElementById('scoreboard-table-body')!;
    this.timerDisplay = document.getElementById('hud-timer-value')!;
  }

  public updateLocalPlayer(p: PlayerState): void {
    // Health bar
    const hpRatio = Math.max(0, Math.min(1, p.health / 100));
    this.healthFill.style.width = `${hpRatio * 100}%`;
    this.healthValue.textContent = `${Math.ceil(p.health)}`;

    if (hpRatio < 0.3) {
      this.healthFill.style.backgroundColor = '#ef4444';
    } else if (hpRatio < 0.6) {
      this.healthFill.style.backgroundColor = '#eab308';
    } else {
      this.healthFill.style.backgroundColor = '#22c55e';
    }

    // Fuel bar
    const fuelRatio = Math.max(0, Math.min(1, p.fuel / 100));
    this.fuelFill.style.width = `${fuelRatio * 100}%`;
    this.fuelValue.textContent = `${Math.round(p.fuel)}%`;

    // Weapon & Ammo
    const cfg = WEAPONS[p.currentWeapon];
    this.weaponName.textContent = cfg.name;

    if (p.isReloading) {
      this.ammoValue.textContent = `RELOADING...`;
      this.reloadPrompt.style.display = 'block';
    } else {
      this.ammoValue.textContent = `${p.ammo} / ${cfg.magazineSize}`;
      this.reloadPrompt.style.display = p.ammo === 0 ? 'block' : 'none';
    }
  }

  public updateTimer(seconds: number): void {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  public addKillFeedItem(event: CombatEvent): void {
    const item = document.createElement('div');
    item.className = 'kill-feed-item';

    if (event.type === 'kill') {
      const killer = event.attackerName || 'Unknown';
      const victim = event.victimName || 'Unknown';
      const weapon = event.weaponType ? event.weaponType.toUpperCase() : 'WEAPON';
      item.innerHTML = `<span class="kf-killer">${this.escape(killer)}</span> [${weapon}] <span class="kf-victim">${this.escape(victim)}</span>`;
    } else if (event.type === 'suicide') {
      const victim = event.victimName || 'Unknown';
      item.innerHTML = `<span class="kf-victim">${this.escape(victim)}</span> fell into the void`;
    } else {
      return;
    }

    this.killFeed.appendChild(item);

    // Auto fadeout after 4.5 seconds
    setTimeout(() => {
      item.classList.add('fade-out');
      setTimeout(() => item.remove(), 500);
    }, 4000);
  }

  public showCountdown(seconds: number): void {
    this.countdownOverlay.style.display = 'flex';
    this.countdownNumber.textContent = seconds > 0 ? String(seconds) : 'GO!';

    if (seconds <= 0) {
      setTimeout(() => {
        this.countdownOverlay.style.display = 'none';
      }, 700);
    }
  }

  public showMatchEnd(winnerName: string, scoreboard: ScoreboardEntry[]): void {
    this.matchEndOverlay.style.display = 'flex';
    this.winnerText.textContent = `${winnerName} VICTORIOUS!`;

    this.scoreboardBody.innerHTML = '';
    scoreboard.forEach((entry, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${idx + 1}</td>
        <td style="color:${entry.color}; font-weight:bold;">${this.escape(entry.name)}</td>
        <td>${entry.kills}</td>
        <td>${entry.deaths}</td>
        <td><strong>${entry.score}</strong></td>
      `;
      this.scoreboardBody.appendChild(row);
    });
  }

  public hideMatchEnd(): void {
    this.matchEndOverlay.style.display = 'none';
  }

  private escape(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
