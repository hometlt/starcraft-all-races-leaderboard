import { NgModule } from '@angular/core';
import {RouterModule, Routes, UrlSegment} from '@angular/router';
import {LeaderboardComponent} from "./leaderboard/leaderboard.component";

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'arc/eu' },
  { path: 'arc', pathMatch: 'full', redirectTo: 'arc/eu' },
  { path: 'scion', pathMatch: 'full', redirectTo: 'scion/na' },
  // { path: '', pathMatch: 'full', component: LeaderboardComponent },
  {
    matcher: (url: UrlSegment[]) => ({consumed: url, parameters: {}}),
    component: LeaderboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
