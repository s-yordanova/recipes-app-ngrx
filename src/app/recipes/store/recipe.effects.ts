import { Actions, createEffect, ofType } from "@ngrx/effects";
import * as RecipesActions from '../store/recipe.actions';
import { map, switchMap, withLatestFrom } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { Recipe } from "../recipe.model";
import { Injectable } from "@angular/core";
import { Store } from "@ngrx/store";
import * as fromApp from '../../store/app.reducer';


@Injectable()
export class RecipeEffects {

    fetchRecipes = createEffect((): any => {
        return this.actons$.pipe(
            ofType(RecipesActions.FETCH_RECIPES),
            switchMap(() => {
                return this.http.get<Recipe[]>(
                    'https://angular-project-e6852-default-rtdb.firebaseio.com/recipes.json',
                )

            }),
            map(recipes => {
                return recipes.map(recipe => {
                    return {
                        ...recipe,
                        ingredients: recipe.ingredients ? recipe.ingredients : []
                    };
                });
            }),
            map(recipes => {
                return new RecipesActions.SetRecipes(recipes);
            })
        )
    }
    )

    storeRecipes = createEffect((): any => {
        return this.actons$.pipe(ofType(RecipesActions.STORE_RECIPES),
            withLatestFrom(this.store.select('recipes')),
            switchMap(([actionData, recipesState]) => {
                return this.http.put(
                    'https://angular-project-e6852-default-rtdb.firebaseio.com/recipes.json',
                    recipesState.recipes
                )
            }))
    }, { dispatch: false })


    constructor(private actons$: Actions, private http: HttpClient, private store: Store<fromApp.AppState>) { }
}