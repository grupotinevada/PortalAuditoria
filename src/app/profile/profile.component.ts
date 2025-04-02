import { Component, OnInit } from '@angular/core';
import { IUsuario } from '../../models/user.model';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profile: IUsuario | null = null;

  ngOnInit() {
    this.getProfile();
  }

  getProfile() {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      console.log('data', userData)
      this.profile = JSON.parse(userData) as IUsuario;
    } else {
      this.profile = null;
    }
  }
}
