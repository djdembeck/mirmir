Rails.application.routes.draw do
  root :to => redirect('/sources')
  resources :sources
  # For details on the DSL available within this file, see https://guides.rubyonrails.org/routing.html
end
