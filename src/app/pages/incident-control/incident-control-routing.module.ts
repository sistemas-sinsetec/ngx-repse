import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IncidentControlComponent } from './incident-control.component';
import { IncidentViewerComponent } from './incident-viewer/incident-viewer.component';

const routes: Routes = [
  {
    path: '',
    component: IncidentControlComponent,
    children: [
        {
              path: 'incident-viewer',
              component: IncidentViewerComponent
            },

    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IncidentControlRoutingModule {
}
