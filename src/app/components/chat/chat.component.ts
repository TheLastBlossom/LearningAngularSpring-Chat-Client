import { Component, OnInit } from '@angular/core';
import { Client, IStompSocket } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Message } from 'src/app/models/message';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit{

  private client:Client;
  public message:Message;
  public messages:Message[];
  public connection:boolean;
  public typing:string;
  public clientId: string;
  constructor(){
    this.client = new Client();
    this.connection = false;
    this.message = new Message();    
    this.messages = [];
    this.typing = '';
    this.clientId = 'id-' + new Date().getUTCMilliseconds() + '-' + Math.random().toString(36).substring(2);
    console.log(this.clientId);
  }
  ngOnInit(): void {    
    this.client.webSocketFactory = () => {
      // Hacer un casting a IStompSocket
      return <IStompSocket>new SockJS("http://localhost:8080/chat-websocket");
    }; 
    this.client.onConnect = (frame)=>{
      console.log("Connected: "+this.client.connected + " : " + frame);
      this.connection = true;
      this.client.subscribe('/chat/message', e=>{
        let message:Message = JSON.parse(e.body) as Message;
        message.date = new Date(message.date);
        if(!this.message.color && message.type == 'NEW_USER' && this.message.username == message.username){
          this.message.color = message.color;
        }
        this.messages.push(message);
      });
      this.client.subscribe('/chat/typing', e=>{        
        this.typing = e.body;
        setTimeout(() => {
          this.typing = '';
        }, 3000);
      });
      this.client.subscribe('/chat/history' + this.clientId, e=>{
        const history = JSON.parse(e.body) as Message[];
        this.messages = history.map(m=>{
          m.date = new Date(m.date);
          return m;
        }).reverse();
      });
      this.client.publish({destination: '/app/history', body: this.clientId});
      this.message.type = "NEW_USER";
      this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    }
    this.client.onDisconnect = (frame)=>{
      console.log("Disconnected: "+ !this.client.connected + " : " + frame);
      this.connection = false;
      this.message = new Message();
      this.messages = [];
    }
  }
  connect():void{
    this.client.activate();
  }
  disconnect():void{
    this.client.deactivate();
  }
  submitMessage():void{
    this.message.type = "MESSAGE";
    this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    this.message.text = '';
  }
  iAmTyping() {
    this.client.publish({destination: '/app/typing', body: this.message.username});
  }
}
