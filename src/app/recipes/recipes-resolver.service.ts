import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { Observable, of } from "rxjs";
import { Recipe } from "./recipe.model";
import { Store } from "@ngrx/store";

import * as fromApp from '../store/app.reducer';
import * as RecipesAction from '../recipes/store/recipe.actions';
import { Actions, ofType } from "@ngrx/effects";
import { map, switchMap, take } from "rxjs/operators";

@Injectable({
    providedIn: 'root'
})
export class RecipesResolverService implements Resolve<Recipe[]>{

    constructor(private store: Store<fromApp.AppState>, private actions$: Actions) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Recipe[] | Observable<Recipe[]> | Promise<Recipe[]> {

        return this.store.select('recipes').pipe(
            take(1),
            map(recipesState => recipesState.recipes),
            switchMap(recipes => {
                if (recipes.length === 0) {
                    this.store.dispatch(new RecipesAction.FetchRecipes());
                    return this.actions$.pipe(ofType(RecipesAction.SET_RECIPES),
                        take(1));
                } else {
                    return of(recipes);
                }
            }))


    }

}