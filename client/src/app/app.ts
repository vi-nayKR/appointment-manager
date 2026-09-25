import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  template:
    '<header class="brand-header"><a class="brand-lockup" routerLink="/appointments" aria-label="Intelliveer appointment manager"><img src="/favicon.svg" alt=""><span><strong>intelliveer</strong><small>INGENIOUS SHIFT</small></span></a></header><router-outlet />',
  styleUrl: './app.css',
})
export class App {}
