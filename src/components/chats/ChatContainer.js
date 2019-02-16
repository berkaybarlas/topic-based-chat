import React, { Component } from 'react';
import SideBar from '../sidebar/SideBar'
import { COMMUNITY_CHAT,NEW_COMMUNITY_CHAT, MESSAGE_SENT, MESSAGE_RECIEVED, 
				TYPING, PRIVATE_MESSAGE, USER_CONNECTED, USER_DISCONNECTED,
				NEW_CHAT_USER,TOPIC_CREATED,TOPIC_DELETED } from '../../Events'
import ChatHeading from './ChatHeading'
import Messages from '../messages/Messages'
import MessageInput from '../messages/MessageInput'
import { values, difference, differenceBy } from 'lodash'


export default class ChatContainer extends Component {
	constructor(props) {
	  super(props);	
	
	  this.state = {
		  chats:[], //clouddan cek bunu 
		  users:[],
	  	activeChat:null
	  }
	}

	componentDidMount() {
		const { socket } = this.props
		this.initSocket(socket)
	}
	
	componentWillUnmount() {
		const { socket } = this.props
		socket.off(PRIVATE_MESSAGE)
		socket.off(USER_CONNECTED)
		socket.off(USER_DISCONNECTED)
		socket.off(NEW_CHAT_USER)
		socket.off(TOPIC_CREATED)
		socket.off(TOPIC_DELETED)
	}
	
	initSocket(socket){
		socket.emit(COMMUNITY_CHAT, this.addChat)
		socket.on(PRIVATE_MESSAGE, this.addChat)
		socket.on('connect', ()=>{
			socket.emit(COMMUNITY_CHAT, this.addChat)
		});
		socket.on(USER_CONNECTED, (users)=>{
			this.setState({ users: values(users) })
		});
		socket.on(USER_DISCONNECTED, (users)=>{
			const removedUsers = differenceBy( this.state.users, values(users), 'id')
			this.removeUsersFromChat(removedUsers)
			this.setState({ users: values(users) })			
		});
		socket.on(TOPIC_CREATED,(chat)=>{
			//this.setState({chats: values(chats)})
			this.addChat(chat,false);
		});
		socket.on(TOPIC_DELETED, (chats)=>{
			//const deletedTopic = differenceBy( this.state.users, values(users), 'id')
			//this.removeTopicsFromChat(deletedTopic)
			//this.setState({ chats: values(users) })			
		});
		socket.on(NEW_CHAT_USER, this.addUserToChat)
	}

	sendOpenPrivateMessage = (reciever) => {
		const { socket, user } = this.props
		const { activeChat } = this.state
		socket.emit(PRIVATE_MESSAGE, {reciever, sender:user.name, activeChat})

	}
/*
doldur burayi

*/

	openPublicMessage = (chatName) => {
		const{socket} = this.props;
		const addChat = this.addChat;
		//const{activeChat } = this.state;
		socket.emit(NEW_COMMUNITY_CHAT,addChat);
		
	}
	addUserToChat = ({ chatId, newUser }) => {
		const { chats } = this.state
		const newChats = chats.map( chat => {
			if(chat.id === chatId){
				return Object.assign({}, chat, { users: [ ...chat.users, newUser ] })
			}
			return chat
		})
		this.setState({ chats:newChats })
	}
	removeUsersFromChat = removedUsers => {
		const { chats } = this.state
		const newChats = chats.map( chat => {
			let newUsers = difference( chat.users, removedUsers.map( u => u.name ) )
				return Object.assign({}, chat, { users: newUsers })
		})
		this.setState({ chats: newChats })
	}

	resetChat = (chat)=>{
		console.log("reset chat")
		return this.addChat(chat, true)
	}

	addChat = (chat, reset = false)=>{
		const { socket } = this.props
		const { chats } = this.state
		
		const newChats = reset ? [chat] : [...chats, chat]
		this.setState({chats:newChats, activeChat:chat})

		const messageEvent = `${MESSAGE_RECIEVED}-${chat.id}`
		const typingEvent = `${TYPING}-${chat.id}`

		socket.on(typingEvent, this.updateTypingInChat(chat.id))
		socket.on(messageEvent, this.addMessageToChat(chat.id))
		console.log("chat created with addChat method messageEvent:"+messageEvent+" reset: " +reset )
	}

	addMessageToChat = (chatId)=>{                    
		return message => {
			console.log("new message2")
			const { chats } = this.state
			let newChats = chats.map((chat)=>{
				if(chat.id === chatId)
					chat.messages.push(message)
				return chat
			})

			this.setState({chats:newChats})
		}
	}

	updateTypingInChat = (chatId) =>{
		return ({isTyping, user})=>{
			if(user !== this.props.user.name){

				const { chats } = this.state

				let newChats = chats.map((chat)=>{
					if(chat.id === chatId){
						if(isTyping && !chat.typingUsers.includes(user)){
							chat.typingUsers.push(user)
						}else if(!isTyping && chat.typingUsers.includes(user)){
							chat.typingUsers = chat.typingUsers.filter(u => u !== user)
						}
					}
					return chat
				})
				this.setState({chats:newChats})
			}
		}
	}

	sendMessage = (chatId, message)=>{
		const { socket } = this.props
		socket.emit(MESSAGE_SENT, {chatId, message} )
		console.log("send message")
	}
	
	sendTyping = (chatId, isTyping)=>{
		const { socket } = this.props
		socket.emit(TYPING, {chatId, isTyping})
	}

	setActiveChat = (activeChat)=>{
		this.setState({activeChat})
	}
	render() {
		const { user, logout } = this.props
		const { chats, activeChat, users } = this.state
		return (
			<div className="container">
				<SideBar
					logout={logout}
					chats={chats}
					user={user}
					users={users}
					activeChat={activeChat}
					setActiveChat={this.setActiveChat}
					onSendPrivateMessage={this.sendOpenPrivateMessage}
					openPublicMessage = {this.openPublicMessage}
					/>
				<div className="chat-room-container">
					{
						activeChat !== null ? (

							<div className="chat-room">
								<ChatHeading name={activeChat.name} />
								<Messages 
									messages={activeChat.messages}
									user={user}
									typingUsers={activeChat.typingUsers}
									/>
								<MessageInput 
									sendMessage={
										(message)=>{
											this.sendMessage(activeChat.id, message)
										}
									}
									sendTyping={
										(isTyping)=>{
											this.sendTyping(activeChat.id, isTyping)
										}
									}
									/>

							</div>
						):
						<div className="chat-room choose">
							<h3>Choose a chat!</h3>
						</div>
					}
				</div>

			</div>
		);
	}
}
