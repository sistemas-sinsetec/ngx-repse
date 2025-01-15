import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IncidentControlComponent } from './incident-control.component';

const routes: Routes = [
  { path: '', component: IncidentControlComponent },
  
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})
export class IncidentControlRoutingModule { }
