import {Component, OnInit} from '@angular/core';

import {SCDataService} from "../sc-data.service";

@Component({
  selector: 'sc-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.less']
})
export class LeaderboardComponent implements OnInit {

  player: any

  constructor(public scdata: SCDataService) {
  }

  ngOnInit(): void {
  }
  setGames(row: any){
    this.player = row
  }
  closeGames(){
    this.player = null
  }


}
