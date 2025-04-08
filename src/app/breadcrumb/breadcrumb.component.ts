import { Component, OnDestroy, OnInit } from '@angular/core';
import { BreadcrumbService } from 'src/services/breadcrumb.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css'
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: { label: string, url: string }[] = [];
  private subscription: Subscription = new Subscription;

  constructor(private breadcrumbService: BreadcrumbService) {}

  ngOnInit(): void {
    this.subscription = this.breadcrumbService.breadcrumbs$.subscribe(
      breadcrumbs => this.breadcrumbs = breadcrumbs
      
    );
    console.log('🔹 Breadcrumbs iniciales:', this.breadcrumbs);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}