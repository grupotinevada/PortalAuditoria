import { Component, OnInit } from '@angular/core';
import { IUsuario } from '../../models/user.model';
import { UserService } from 'src/services/user.service';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profile: IUsuario | null = null;
constructor(private userService: UserService){}

  ngOnInit() {
    this.profile = this.userService.getProfile();
  }


}
