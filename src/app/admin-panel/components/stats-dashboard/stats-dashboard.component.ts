// stats-dashboard.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Statistics {
  monthlyClients: number;
  monthlyRevenue: number;
  averageRating: number;
  weeklyAppointments: number;
}

interface StatCard {
  icon: string;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

@Component({
  selector: 'app-stats-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./stats-dashboard.component.html",
  styleUrls: ['./stats-dashboard.component.scss']
})
export class StatsDashboardComponent {
  stats: Statistics = {
    monthlyClients: 287,
    monthlyRevenue: 8450,
    averageRating: 4.8,
    weeklyAppointments: 68
  };

  get statCards(): StatCard[] {
    return [
      {
        icon: 'bi bi-people',
        title: 'Clientes este mes',
        value: this.formatNumber(this.stats.monthlyClients),
        change: '+12% vs mes anterior',
        changeType: 'positive'
      },
      {
        icon: 'bi bi-currency-euro',
        title: 'Ingresos mensuales',
        value: `${this.formatNumber(this.stats.monthlyRevenue)}€`,
        change: '+8% vs mes anterior',
        changeType: 'positive'
      },
      {
        icon: 'bi bi-star',
        title: 'Valoración media',
        value: `${this.stats.averageRating}/5`,
        change: 'Sin cambios',
        changeType: 'neutral'
      },
      {
        icon: 'bi bi-calendar-check',
        title: 'Citas esta semana',
        value: this.formatNumber(this.stats.weeklyAppointments),
        change: '+5 vs semana anterior',
        changeType: 'positive'
      }
    ];
  }

  formatNumber(num: number): string {
    return num.toLocaleString('es-ES');
  }

  getChangeClass(change: string): string {
    if (change.includes('+')) return 'positive';
    if (change.includes('-')) return 'negative';
    return 'neutral';
  }
}