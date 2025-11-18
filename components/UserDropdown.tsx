'use client'

//https://ui.shadcn.com/docs/components/dropdown-menu

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "./ui/button"
import NavItems from "./NavItems"
import { LogOut } from "lucide-react"
import { signOut } from "@/lib/actions/auth.actions"

const UserDropdown = ({user}:{user:User}) => {
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push("/sign-in");
    }

// https://ui.shadcn.com/docs/components/avatar
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant ="ghost" className ="flex items-center gap-3 text-gray-400 hover:text-yellow-500"> 
          
          <Avatar className ="w-8 h-8">
            <AvatarImage src="https://i.pinimg.com/1200x/35/9a/50/359a50453ff205dc0e26b9a3d4bb6544.jpg" />
            <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium text-gray-400">
              {user.name}
            </span>
          </div>
        
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="text-gray-400">
        <DropdownMenuLabel>
          <div className="flex relative items-center gap-3 py-2">
            
            <Avatar className ="w-10 h-10">
              <AvatarImage src="https://i.pinimg.com/1200x/35/9a/50/359a50453ff205dc0e26b9a3d4bb6544.jpg" />
              <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-400">
                {user.name}
              </span>
              <span className="text-sm text-gray-500">
                {user.email}
              </span>
            </div>
          </div>
          
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600"/>
        <DropdownMenuItem onClick={handleSignOut} className="text-gray-100 text-md font-medium focus:bg-transparent focus:text-yellow-500 transition-colors cursor-pointer">
          <LogOut className="mr-2 h-4 w-4 hidden sm:block" />
          Log Out
        </DropdownMenuItem>
        <DropdownMenuSeparator className="hidden sm:block bg-gray-600"/>
        <nav className="sm: hidden">
          <NavItems />
        </nav>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserDropdown
